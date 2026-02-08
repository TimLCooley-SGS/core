/**
 * Runs all control plane migrations against the control plane database.
 * Usage: pnpm migrate:control-plane
 */
import "dotenv/config";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../db/control-plane/migrations",
);

async function main() {
  const databaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!databaseUrl) {
    console.error("CONTROL_PLANE_DATABASE_URL is required");
    process.exit(1);
  }

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

    console.log(`\nDone. Applied ${count} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
