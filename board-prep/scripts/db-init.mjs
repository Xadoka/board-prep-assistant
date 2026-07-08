// Apply db/schema.sql to the database in DATABASE_URL.
// Usage: node scripts/db-init.mjs   (loads .env yourself, e.g. with `node --env-file=.env`)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Try: node --env-file=.env scripts/db-init.mjs");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log("Schema applied.");
} finally {
  await client.end();
}
