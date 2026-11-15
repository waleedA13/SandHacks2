import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );

const pool = new Pool({ connectionString: url });
for (const file of ["db/schema.sql", "db/seed.sql"]) {
  await pool.query(readFileSync(file, "utf8"));
  console.log(`applied ${file}`);
}
const { rows } = await pool.query("select count(*)::int as n from listings");
console.log(`listings: ${rows[0].n}`);
await pool.end();
