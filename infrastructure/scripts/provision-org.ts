/**
 * Provisions a new tenant organization:
 * 1. Creates a Supabase project via the Management API
 * 2. Waits for the project to be ready
 * 3. Runs tenant migrations and seeds
 * 4. Creates pending admin person + identity_org_link + role assignment
 * 5. Stores credentials in the control plane organizations table
 *
 * Usage:
 *   Provision an existing org (created via web UI):
 *     pnpm provision:org --org-id <uuid>
 *
 *   Create + provision in one step (legacy):
 *     pnpm provision:org --name "Museum of Art" --slug museum-of-art --plan-tier basic
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

interface PendingAdmin {
  global_identity_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
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

/**
 * Sets up the pending admin in the newly provisioned tenant DB:
 * 1. Creates a persons record in the tenant DB
 * 2. Creates an identity_org_link in the control plane
 * 3. Assigns the "Org Admin" role via staff_assignments
 */
async function setupPendingAdmin(
  cpClient: pg.Client,
  tenantDbUrl: string,
  orgId: string,
  admin: PendingAdmin,
): Promise<void> {
  const tenantClient = new pg.Client({ connectionString: tenantDbUrl });
  await tenantClient.connect();

  try {
    // Create person record in tenant DB
    const {
      rows: [person],
    } = await tenantClient.query(
      `INSERT INTO persons (first_name, last_name, display_name, email, global_identity_id, login_enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [admin.first_name, admin.last_name, admin.full_name, admin.email, admin.global_identity_id],
    );
    const personId = person.id as string;
    console.log(`  Created person: ${personId}`);

    // Assign "Org Admin" role
    const { rows: roleRows } = await tenantClient.query(
      `SELECT id FROM roles WHERE name = 'Org Admin' AND is_system = true LIMIT 1`,
    );
    if (roleRows.length > 0) {
      await tenantClient.query(
        `INSERT INTO staff_assignments (person_id, role_id) VALUES ($1, $2)`,
        [personId, roleRows[0].id],
      );
      console.log(`  Assigned "Org Admin" role`);
    } else {
      console.warn(`  WARNING: "Org Admin" role not found — skipping role assignment`);
    }

    // Create identity_org_link in control plane
    await cpClient.query(
      `INSERT INTO identity_org_links (global_identity_id, organization_id, tenant_person_id, has_staff_access, has_patron_access)
       VALUES ($1, $2, $3, true, true)`,
      [admin.global_identity_id, orgId, personId],
    );
    console.log(`  Created identity_org_link`);
  } finally {
    await tenantClient.end();
  }
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

export async function provisionExistingOrg(orgId: string): Promise<void> {
  const cpDatabaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpDatabaseUrl)
    throw new Error("CONTROL_PLANE_DATABASE_URL is required");

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) throw new Error("SUPABASE_DB_PASSWORD is required");

  const cpClient = new pg.Client({ connectionString: cpDatabaseUrl });
  await cpClient.connect();

  try {
    // Load the org record
    const { rows: orgRows } = await cpClient.query(
      `SELECT id, name, slug, status, settings FROM organizations WHERE id = $1`,
      [orgId],
    );
    if (orgRows.length === 0) throw new Error(`Organization ${orgId} not found`);

    const org = orgRows[0] as {
      id: string;
      name: string;
      slug: string;
      status: string;
      settings: { pending_admin?: PendingAdmin };
    };

    if (org.status !== "provisioning") {
      throw new Error(
        `Organization is in '${org.status}' status — expected 'provisioning'`,
      );
    }

    console.log(`Provisioning org: ${org.name} (${org.slug})`);

    try {
      // Create Supabase project
      console.log("Creating Supabase project...");
      const projectName = `sgscore-${org.slug}`;
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

      // Set up pending admin if present
      if (org.settings?.pending_admin) {
        console.log("Setting up org admin...");
        await setupPendingAdmin(cpClient, tenantDbUrl, orgId, org.settings.pending_admin);
      } else {
        console.warn("No pending_admin in settings — skipping admin setup");
      }

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
         VALUES ('org.provisioned', 'organization', $1, $2)`,
        [orgId, JSON.stringify({ name: org.name, slug: org.slug })],
      );

      console.log(`\nOrg '${org.name}' provisioned successfully.`);
      console.log(`  ID: ${orgId}`);
      console.log(`  Slug: ${org.slug}`);
      console.log(`  URL: ${supabaseUrl}`);
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

  // New mode: provision an existing org created via the web UI
  if (parsed["org-id"]) {
    await provisionExistingOrg(parsed["org-id"]);
    return;
  }

  // Legacy mode: create + provision in one step
  if (!parsed.name || !parsed.slug) {
    console.error("Usage:");
    console.error('  provision-org.ts --org-id <uuid>                            (provision existing org)');
    console.error('  provision-org.ts --name "Org Name" --slug org-slug          (create + provision)');
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
