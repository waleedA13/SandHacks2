import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sql } from "@/backend/db/client";

const migration = readFileSync(
  "src/backend/db/migrations/003-do-not-call.sql",
  "utf8",
);

describe("migration 003-do-not-call", () => {
  it("is safe to run twice and keeps existing rows", async () => {
    await sql.query(migration);
    await sql`insert into do_not_call (phone) values ('0000000003') on conflict do nothing`;
    await sql.query(migration);
    const rows =
      await sql`select phone, created_at from do_not_call where phone = '0000000003'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].created_at).not.toBeNull();
    await sql`delete from do_not_call where phone = '0000000003'`;
  });
});
