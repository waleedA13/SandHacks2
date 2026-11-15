// Applies every file in src/backend/db/migrations in name order. Each file must be safe to run twice.
// Usage: tsx src/backend/db/migrate.ts <env file>
import { readdirSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Pool } from "@neondatabase/serverless";
import { configureNeonForUrl } from "./neon-local";

const envFile = process.argv[2];
if (!envFile)
  throw new Error(
    "db:migrate needs an env file: tsx src/backend/db/migrate.ts .env.local",
  );
// Read the URL from the named file only, never the shell, so the target is always the one you chose.
const env = parseEnv(readFileSync(envFile, "utf8"));
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
if (!url) throw new Error(`DATABASE_URL is not set in ${envFile}.`);

const dir = "src/backend/db/migrations";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
// Migrations run on the live database: they may only add, never remove.
for (const f of files) {
  const text = readFileSync(`${dir}/${f}`, "utf8").replace(/--.*$/gm, "");
  if (
    /\b(drop|truncate)\b|\bdelete\s+from\b|\bupdate\s+\S+\s+set\b|\balter\s+column\b/i.test(
      text,
    )
  )
    throw new Error(`${f} removes or rewrites data; migrations may only add.`);
}

configureNeonForUrl(url);
const pool = new Pool({ connectionString: url });
try {
  for (const f of files) {
    await pool.query(readFileSync(`${dir}/${f}`, "utf8"));
    console.log(`applied ${f}`);
  }
} finally {
  await pool.end();
}
