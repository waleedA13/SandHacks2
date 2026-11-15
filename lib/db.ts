import { neon } from "@neondatabase/serverless";
import { configureNeonForUrl } from "./neon-local";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

configureNeonForUrl(process.env.DATABASE_URL);
export const sql = neon(process.env.DATABASE_URL);
