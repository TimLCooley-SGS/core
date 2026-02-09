/**
 * Shared provisioning logic for tenant organizations.
 *
 * Used by:
 * - The web UI create-org flow (inline provisioning)
 * - The CLI `provision-org.ts` script
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_MGMT_API = "https://api.supabase.com/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingAdmin {
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

// ---------------------------------------------------------------------------
// Supabase Management API helpers
// ---------------------------------------------------------------------------

export async function supabaseMgmtFetch(
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

export async function createSupabaseProject(
  name: string,
  dbPassword: string,
): Promise<SupabaseProject> {
  const orgId = process.env.SUPABASE_ORG_ID;
  if (!orgId) throw new Error("SUPABASE_ORG_ID is required");

  const res = await supabaseMgmtFetch("/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: orgId,
      name,
      db_pass: dbPassword,
      region: "us-east-1",
      plan: "free",
    }),
  });

  return (await res.json()) as SupabaseProject;
}

export async function waitForProject(
  projectRef: string,
  maxWaitMs = 120_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await supabaseMgmtFetch(`/projects/${projectRef}`);
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

export async function getApiKeys(
  projectRef: string,
): Promise<{ anon: string; service_role: string }> {
  const res = await supabaseMgmtFetch(`/projects/${projectRef}/api-keys`);
  const keys = (await res.json()) as { name: string; api_key: string }[];

  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const serviceRole = keys.find((k) => k.name === "service_role")?.api_key;

  if (!anon || !serviceRole) throw new Error("Could not find API keys");
  return { anon, service_role: serviceRole };
}

export async function deleteSupabaseProject(
  projectRef: string,
): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required");

  const res = await fetch(`${SUPABASE_MGMT_API}/projects/${projectRef}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn(
      `Warning: Failed to delete Supabase project ${projectRef}: ${res.status} ${body}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Tenant migration runner
// ---------------------------------------------------------------------------

/**
 * Finds the infrastructure/db/tenant directory by searching up from cwd
 * for the pnpm-workspace.yaml marker.
 */
function findMonorepoRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(
    "Could not find monorepo root (no pnpm-workspace.yaml found)",
  );
}

export async function runTenantMigrations(
  databaseUrl: string,
  options?: { seed?: boolean },
): Promise<void> {
  const root = findMonorepoRoot();
  const migrationsDir = path.join(root, "infrastructure/db/tenant/migrations");
  const seedsDir = path.join(root, "infrastructure/db/tenant/seeds");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        name text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations ORDER BY id",
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip: ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`  apply: ${file}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAILED: ${file}`);
        throw err;
      }
    }

    console.log(`Applied ${count} migration(s).`);

    if (options?.seed) {
      console.log("\nRunning seeds...");
      const seedFiles = fs
        .readdirSync(seedsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of seedFiles) {
        if (appliedSet.has(`seed:${file}`)) {
          console.log(`  skip seed: ${file} (already applied)`);
          continue;
        }

        const sql = fs.readFileSync(path.join(seedsDir, file), "utf-8");
        console.log(`  seed: ${file}`);

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
            `seed:${file}`,
          ]);
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`  SEED FAILED: ${file}`);
          throw err;
        }
      }
    }
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Pending admin setup
// ---------------------------------------------------------------------------

export async function setupPendingAdmin(
  cpClient: pg.Client,
  tenantDbUrl: string,
  orgId: string,
  admin: PendingAdmin,
): Promise<void> {
  const tenantClient = new pg.Client({ connectionString: tenantDbUrl });
  await tenantClient.connect();

  try {
    const {
      rows: [person],
    } = await tenantClient.query(
      `INSERT INTO persons (first_name, last_name, display_name, email, global_identity_id, login_enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [
        admin.first_name,
        admin.last_name,
        admin.full_name,
        admin.email,
        admin.global_identity_id,
      ],
    );
    const personId = person.id as string;
    console.log(`  Created person: ${personId}`);

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
      console.warn(
        `  WARNING: "Org Admin" role not found — skipping role assignment`,
      );
    }

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

// ---------------------------------------------------------------------------
// Main provisioning orchestrator
// ---------------------------------------------------------------------------

/**
 * Provisions an existing organization that was created via the web UI.
 * Expects the org to be in 'provisioning' status with pending_admin in settings.
 *
 * 1. Creates a Supabase project
 * 2. Waits for it to be healthy
 * 3. Retrieves API keys
 * 4. Runs tenant migrations + seeds
 * 5. Sets up the pending admin (person record, role, identity_org_link)
 * 6. Updates the org record with credentials and marks it active
 *
 * On failure: marks the org as 'archived'.
 */
export async function provisionOrg(orgId: string): Promise<void> {
  const cpDatabaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpDatabaseUrl)
    throw new Error("CONTROL_PLANE_DATABASE_URL is required");

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) throw new Error("SUPABASE_DB_PASSWORD is required");

  const cpClient = new pg.Client({ connectionString: cpDatabaseUrl });
  await cpClient.connect();

  try {
    const { rows: orgRows } = await cpClient.query(
      `SELECT id, name, slug, status, settings FROM organizations WHERE id = $1`,
      [orgId],
    );
    if (orgRows.length === 0)
      throw new Error(`Organization ${orgId} not found`);

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
      console.log("Creating Supabase project...");
      const projectName = `sgscore-${org.slug}`;
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

      if (org.settings?.pending_admin) {
        console.log("Setting up org admin...");
        await setupPendingAdmin(
          cpClient,
          tenantDbUrl,
          orgId,
          org.settings.pending_admin,
        );
      } else {
        console.warn(
          "No pending_admin in settings — skipping admin setup",
        );
      }

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
         VALUES ('org.provisioned', 'organization', $1, $2)`,
        [orgId, JSON.stringify({ name: org.name, slug: org.slug })],
      );

      console.log(`\nOrg '${org.name}' provisioned successfully.`);
      console.log(`  ID: ${orgId}`);
      console.log(`  Slug: ${org.slug}`);
      console.log(`  URL: ${supabaseUrl}`);
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
