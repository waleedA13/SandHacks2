import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import { configureNeonForUrl, isLocalNeonHost } from "./neon-local";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );

// --env-file does not override a DATABASE_URL already set in the shell, so the test reset checks the host itself.
if (process.argv.includes("--local-only") && !isLocalNeonHost(url))
  throw new Error(
    "db:test:reset refuses to run: the database is not the local Docker one. Unset DATABASE_URL and DATABASE_URL_UNPOOLED in this shell.",
  );

configureNeonForUrl(url);
const pool = new Pool({ connectionString: url });
for (const file of ["src/backend/db/schema.sql", "src/backend/db/seed.sql"]) {
  await pool.query(readFileSync(file, "utf8"));
  console.log(`applied ${file}`);
}
const { rows } = await pool.query("select count(*)::int as n from listings");
console.log(`listings: ${rows[0].n}`);
await pool.end();
