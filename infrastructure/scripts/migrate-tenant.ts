/**
 * Runs all tenant migrations against a specific tenant database.
 * Usage: pnpm migrate:tenant <database-url>
 *   or:  pnpm migrate:tenant --org-slug <slug>
 *
 * When using --org-slug, the database URL is resolved from the control plane.
 */
import "dotenv/config";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../db/tenant/migrations");
const SEEDS_DIR = path.resolve(__dirname, "../db/tenant/seeds");

export async function runTenantMigrations(
  databaseUrl: string,
  options?: { seed?: boolean },
) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        name text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations ORDER BY id",
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    // Read and sort migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip: ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
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

    // Run seeds if requested
    if (options?.seed) {
      console.log("\nRunning seeds...");
      const seedFiles = fs
        .readdirSync(SEEDS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of seedFiles) {
        if (appliedSet.has(`seed:${file}`)) {
          console.log(`  skip seed: ${file} (already applied)`);
          continue;
        }

        const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf-8");
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

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: migrate-tenant.ts <database-url>");
    console.error("       migrate-tenant.ts --org-slug <slug>");
    process.exit(1);
  }

  let databaseUrl: string;

  if (args[0] === "--org-slug") {
    const slug = args[1];
    if (!slug) {
      console.error("Missing slug argument");
      process.exit(1);
    }

    // Resolve from control plane
    const cpUrl = process.env.CONTROL_PLANE_DATABASE_URL;
    if (!cpUrl) {
      console.error(
        "CONTROL_PLANE_DATABASE_URL is required for --org-slug mode",
      );
      process.exit(1);
    }

    const cpClient = new pg.Client({ connectionString: cpUrl });
    await cpClient.connect();
    try {
      const { rows } = await cpClient.query(
        "SELECT database_url FROM organizations WHERE slug = $1",
        [slug],
      );
      if (rows.length === 0) {
        console.error(`Organization '${slug}' not found`);
        process.exit(1);
      }
      if (!rows[0].database_url) {
        console.error(
          `Organization '${slug}' has no database_url — run backfill first`,
        );
        process.exit(1);
      }
      databaseUrl = rows[0].database_url as string;
    } finally {
      await cpClient.end();
    }
  } else {
    databaseUrl = args[0];
  }

  console.log("Running tenant migrations...");
  await runTenantMigrations(databaseUrl, { seed: true });
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
