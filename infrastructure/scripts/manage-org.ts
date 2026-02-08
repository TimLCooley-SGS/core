/**
 * Manages organization lifecycle: suspend, activate, archive, delete (dev only).
 *
 * Usage:
 *   pnpm manage:org suspend --slug museum-of-art
 *   pnpm manage:org activate --slug museum-of-art
 *   pnpm manage:org archive --slug museum-of-art
 *   pnpm manage:org delete --slug museum-of-art   (dev only)
 */
import "dotenv/config";
import pg from "pg";

const SUPABASE_MGMT_API = "https://api.supabase.com/v1";

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

  return res;
}

type Action = "suspend" | "activate" | "archive" | "delete";

async function manageOrg(action: Action, slug: string) {
  const cpDatabaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpDatabaseUrl)
    throw new Error("CONTROL_PLANE_DATABASE_URL is required");

  const cpClient = new pg.Client({ connectionString: cpDatabaseUrl });
  await cpClient.connect();

  try {
    // Look up org
    const { rows } = await cpClient.query(
      "SELECT id, name, status, supabase_project_id FROM organizations WHERE slug = $1",
      [slug],
    );
    if (rows.length === 0) {
      console.error(`Organization '${slug}' not found.`);
      process.exit(1);
    }
    const org = rows[0] as {
      id: string;
      name: string;
      status: string;
      supabase_project_id: string | null;
    };

    switch (action) {
      case "suspend": {
        if (org.status !== "active") {
          console.error(
            `Cannot suspend org in '${org.status}' state. Must be 'active'.`,
          );
          process.exit(1);
        }

        // Pause the Supabase project
        if (org.supabase_project_id) {
          console.log("Pausing Supabase project...");
          await supabaseFetch(
            `/projects/${org.supabase_project_id}/pause`,
            { method: "POST" },
          );
        }

        await cpClient.query(
          "UPDATE organizations SET status = 'suspended' WHERE id = $1",
          [org.id],
        );
        await cpClient.query(
          `INSERT INTO platform_audit_log (action, resource_type, resource_id, metadata)
           VALUES ('org.suspended', 'organization', $1, $2)`,
          [org.id, JSON.stringify({ name: org.name, slug })],
        );
        console.log(`Org '${org.name}' suspended.`);
        break;
      }

      case "activate": {
        if (org.status !== "suspended") {
          console.error(
            `Cannot activate org in '${org.status}' state. Must be 'suspended'.`,
          );
          process.exit(1);
        }

        // Restore the Supabase project
        if (org.supabase_project_id) {
          console.log("Restoring Supabase project...");
          await supabaseFetch(
            `/projects/${org.supabase_project_id}/restore`,
            { method: "POST" },
          );
        }

        await cpClient.query(
          "UPDATE organizations SET status = 'active' WHERE id = $1",
          [org.id],
        );
        await cpClient.query(
          `INSERT INTO platform_audit_log (action, resource_type, resource_id, metadata)
           VALUES ('org.activated', 'organization', $1, $2)`,
          [org.id, JSON.stringify({ name: org.name, slug })],
        );
        console.log(`Org '${org.name}' re-activated.`);
        break;
      }

      case "archive": {
        if (org.status === "archived") {
          console.log("Org is already archived.");
          return;
        }

        // Pause the Supabase project (don't delete for compliance)
        if (org.supabase_project_id) {
          console.log("Pausing Supabase project...");
          await supabaseFetch(
            `/projects/${org.supabase_project_id}/pause`,
            { method: "POST" },
          );
        }

        // Suspend all identity-org links
        await cpClient.query(
          "UPDATE identity_org_links SET status = 'suspended' WHERE organization_id = $1 AND status = 'active'",
          [org.id],
        );

        await cpClient.query(
          "UPDATE organizations SET status = 'archived' WHERE id = $1",
          [org.id],
        );
        await cpClient.query(
          `INSERT INTO platform_audit_log (action, resource_type, resource_id, metadata)
           VALUES ('org.archived', 'organization', $1, $2)`,
          [org.id, JSON.stringify({ name: org.name, slug })],
        );
        console.log(`Org '${org.name}' archived.`);
        break;
      }

      case "delete": {
        if (process.env.NODE_ENV === "production") {
          console.error(
            "Cannot delete orgs in production. Use archive instead.",
          );
          process.exit(1);
        }

        // Delete the Supabase project
        if (org.supabase_project_id) {
          console.log("Deleting Supabase project...");
          const res = await supabaseFetch(
            `/projects/${org.supabase_project_id}`,
            { method: "DELETE" },
          );
          if (!res.ok) {
            console.warn(
              `Warning: Failed to delete Supabase project (${res.status}). Continuing cleanup...`,
            );
          }
        }

        // Clean up control plane records
        await cpClient.query(
          "DELETE FROM identity_org_links WHERE organization_id = $1",
          [org.id],
        );
        await cpClient.query(
          "DELETE FROM impersonation_sessions WHERE organization_id = $1",
          [org.id],
        );
        await cpClient.query("DELETE FROM organizations WHERE id = $1", [
          org.id,
        ]);

        await cpClient.query(
          `INSERT INTO platform_audit_log (action, resource_type, resource_id, metadata)
           VALUES ('org.deleted', 'organization', $1, $2)`,
          [
            org.id,
            JSON.stringify({ name: org.name, slug, env: "development" }),
          ],
        );
        console.log(`Org '${org.name}' deleted (dev mode).`);
        break;
      }
    }
  } finally {
    await cpClient.end();
  }
}

// CLI entry point
async function main() {
  const [action, ...rest] = process.argv.slice(2);
  const validActions = ["suspend", "activate", "archive", "delete"];

  if (!validActions.includes(action)) {
    console.error(
      `Usage: manage-org.ts <${validActions.join("|")}> --slug <slug>`,
    );
    process.exit(1);
  }

  let slug = "";
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i] === "--slug") slug = rest[i + 1];
  }

  if (!slug) {
    console.error("--slug is required");
    process.exit(1);
  }

  await manageOrg(action as Action, slug);
}

main().catch((err) => {
  console.error("Operation failed:", err);
  process.exit(1);
});
