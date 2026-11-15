import { expect, it } from "vitest";
import { sql } from "@/lib/db";

// db/seed.sql inserts 12 listings.
it("seeds the fixture listings", async () => {
  const [row] = await sql`select count(*)::int as n from listings`;
  expect(row.n).toBe(12);
});
