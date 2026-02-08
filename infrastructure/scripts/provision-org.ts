/**
 * Provisions a new tenant organization:
 * 1. Creates a Supabase project via the Management API
 * 2. Waits for the project to be ready
 * 3. Runs tenant migrations and seeds
 * 4. Stores credentials in the control plane organizations table
 *
 * Usage: pnpm provision:org --name "Museum of Art" --slug museum-of-art --plan-tier basic
 */
import "dotenv/config";
import pg from "pg";
import { runTenantMigrations } from "./migrate-tenant.js";

const SUPABASE_MGMT_API = "https://api.supabase.com/v1";

interface ProvisionOptions {
  name: string;
  slug: string;
  planTier?: string;
}

interface SupabaseProject {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  endpoint: string;
}

async function supabaseFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required");

  const res = await fetch(`${SUPABASE_MGMT_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase API error ${res.status}: ${body}`);
  }

  return res;
}

async function createSupabaseProject(
  name: string,
  dbPassword: string,
): Promise<SupabaseProject> {
  const orgId = process.env.SUPABASE_ORG_ID;
  if (!orgId) throw new Error("SUPABASE_ORG_ID is required");

  const res = await supabaseFetch("/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: orgId,
      name,
      db_pass: dbPassword,
      region: "us-east-1",
      plan: "free", // Start with free; upgrade via Stripe later
    }),
  });

  return (await res.json()) as SupabaseProject;
}

async function waitForProject(
  projectRef: string,
  maxWaitMs = 120_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await supabaseFetch(`/projects/${projectRef}`);
    const project = (await res.json()) as { status: string };
    if (project.status === "ACTIVE_HEALTHY") return;
    console.log(
      `  Waiting for project to be ready (status: ${project.status})...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(
    `Project ${projectRef} did not become ready within ${maxWaitMs / 1000}s`,
  );
}

async function getApiKeys(
  projectRef: string,
): Promise<{ anon: string; service_role: string }> {
  const res = await supabaseFetch(`/projects/${projectRef}/api-keys`);
  const keys = (await res.json()) as { name: string; api_key: string }[];

  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const serviceRole = keys.find((k) => k.name === "service_role")?.api_key;

  if (!anon || !serviceRole) throw new Error("Could not find API keys");
  return { anon, service_role: serviceRole };
}

export async function provisionOrg(options: ProvisionOptions): Promise<string> {
  const cpDatabaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpDatabaseUrl)
    throw new Error("CONTROL_PLANE_DATABASE_URL is required");

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) throw new Error("SUPABASE_DB_PASSWORD is required");

  const cpClient = new pg.Client({ connectionString: cpDatabaseUrl });
  await cpClient.connect();

  try {
    // Check slug uniqueness
    const { rows: existing } = await cpClient.query(
      "SELECT id FROM organizations WHERE slug = $1",
      [options.slug],
    );
    if (existing.length > 0) {
      throw new Error(
        `Organization with slug '${options.slug}' already exists`,
      );
    }

    // Create org record in provisioning state
    const {
      rows: [org],
    } = await cpClient.query(
      `INSERT INTO organizations (name, slug, status, plan_tier)
       VALUES ($1, $2, 'provisioning', $3)
       RETURNING id`,
      [options.name, options.slug, options.planTier ?? "basic"],
    );
    const orgId = org.id as string;
    console.log(`Created org record: ${orgId}`);

    try {
      // Create Supabase project
      console.log("Creating Supabase project...");
      const projectName = `sgscore-${options.slug}`;
      const project = await createSupabaseProject(projectName, dbPassword);
      const projectRef = project.id;
      console.log(`Created project: ${projectRef}`);

      // Wait for project to be ready
      await waitForProject(projectRef);
      console.log("Project is ready.");

      // Get API keys
      const keys = await getApiKeys(projectRef);
      const supabaseUrl = `https://${projectRef}.supabase.co`;

      // Run tenant migrations
      const tenantDbUrl = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
      console.log("Running tenant migrations...");
      await runTenantMigrations(tenantDbUrl, { seed: true });

      // Update org record with credentials and mark active
      await cpClient.query(
        `UPDATE organizations SET
           supabase_project_id = $1,
           supabase_url = $2,
           supabase_anon_key = $3,
           supabase_service_key = $4,
           status = 'active'
         WHERE id = $5`,
        [projectRef, supabaseUrl, keys.anon, keys.service_role, orgId],
      );

      // Log to platform audit log
      await cpClient.query(
        `INSERT INTO platform_audit_log (action, resource_type, resource_id, metadata)
         VALUES ('org.created', 'organization', $1, $2)`,
        [orgId, JSON.stringify({ name: options.name, slug: options.slug })],
      );

      console.log(`\nOrg '${options.name}' provisioned successfully.`);
      console.log(`  ID: ${orgId}`);
      console.log(`  Slug: ${options.slug}`);
      console.log(`  URL: ${supabaseUrl}`);

      return orgId;
    } catch (err) {
      // If provisioning fails, mark org as archived
      await cpClient.query(
        "UPDATE organizations SET status = 'archived' WHERE id = $1",
        [orgId],
      );
      throw err;
    }
  } finally {
    await cpClient.end();
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    parsed[key] = args[i + 1];
  }

  if (!parsed.name || !parsed.slug) {
    console.error(
      'Usage: provision-org.ts --name "Org Name" --slug org-slug [--plan-tier basic]',
    );
    process.exit(1);
  }

  await provisionOrg({
    name: parsed.name,
    slug: parsed.slug,
    planTier: parsed["plan-tier"],
  });
}

main().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
