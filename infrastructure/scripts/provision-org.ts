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
import {
  provisionOrg,
  createSupabaseProject,
  waitForProject,
  getApiKeys,
  runTenantMigrations,
} from "@sgscore/api/provisioning";

// ---------------------------------------------------------------------------
// Legacy: create + provision in one step
// ---------------------------------------------------------------------------

async function provisionNewOrg(options: {
  name: string;
  slug: string;
  planTier?: string;
}): Promise<string> {
  const cpDatabaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpDatabaseUrl)
    throw new Error("CONTROL_PLANE_DATABASE_URL is required");

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) throw new Error("SUPABASE_DB_PASSWORD is required");

  const cpClient = new pg.Client({ connectionString: cpDatabaseUrl });
  await cpClient.connect();

  try {
    const { rows: existing } = await cpClient.query(
      "SELECT id FROM organizations WHERE slug = $1",
      [options.slug],
    );
    if (existing.length > 0) {
      throw new Error(
        `Organization with slug '${options.slug}' already exists`,
      );
    }

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
      console.log("Creating Supabase project...");
      const projectName = `sgscore-${options.slug}`;
      const project = await createSupabaseProject(projectName, dbPassword);
      const projectRef = project.id;
      console.log(`Created project: ${projectRef}`);

      await waitForProject(projectRef);
      console.log("Project is ready.");

      const keys = await getApiKeys(projectRef);
      const supabaseUrl = `https://${projectRef}.supabase.co`;

      const tenantDbUrl = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
      console.log("Running tenant migrations...");
      await runTenantMigrations(tenantDbUrl, { seed: true });

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

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    parsed[key] = args[i + 1];
  }

  // New mode: provision an existing org created via the web UI
  if (parsed["org-id"]) {
    await provisionOrg(parsed["org-id"]);
    return;
  }

  // Legacy mode: create + provision in one step
  if (!parsed.name || !parsed.slug) {
    console.error("Usage:");
    console.error(
      '  provision-org.ts --org-id <uuid>                            (provision existing org)',
    );
    console.error(
      '  provision-org.ts --name "Org Name" --slug org-slug          (create + provision)',
    );
    process.exit(1);
  }

  await provisionNewOrg({
    name: parsed.name,
    slug: parsed.slug,
    planTier: parsed["plan-tier"],
  });
}

main().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
