/**
 * Seeds capabilities and default roles into a tenant database.
 * Useful for re-seeding after adding new capabilities to the platform.
 *
 * Usage: pnpm seed:capabilities <database-url>
 */
import "dotenv/config";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, "../db/tenant/seeds");

async function main() {
  const databaseUrl = process.argv[2];
  if (!databaseUrl) {
    console.error("Usage: seed-capabilities.ts <database-url>");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const seedFiles = fs
      .readdirSync(SEEDS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of seedFiles) {
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf-8");
      console.log(`  seed: ${file}`);
      await client.query(sql);
    }

    console.log("\nSeeding complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
