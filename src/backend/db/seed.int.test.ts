import { expect, it } from "vitest";
import { sql } from "@/backend/db/client";

// db/seed.sql inserts 12 listings.
it("seeds the fixture listings", async () => {
  const [row] = await sql`select count(*)::int as n from listings`;
  expect(row.n).toBe(12);
});

// One fixture per booking path, plus one Pay yourself verdict.
it("seeds every booking path and a self-pay listing", async () => {
  const [row] = await sql`
    select
      count(*) filter (where booking_url like 'https://example.com/book/%')::int as booking,
      count(*) filter (where booking_url is null and phone_line_type = 'landline')::int as landline,
      count(*) filter (where booking_url is null and phone_line_type = 'mobile')::int as mobile,
      (select count(*)::int from verdicts where sees_self_pay = 'yes' and lists_insurer = 'no') as self_pay
    from listings`;
  expect(row.booking).toBeGreaterThanOrEqual(1);
  expect(row.landline).toBeGreaterThanOrEqual(1);
  expect(row.mobile).toBeGreaterThanOrEqual(1);
  expect(row.self_pay).toBeGreaterThanOrEqual(1);
});
