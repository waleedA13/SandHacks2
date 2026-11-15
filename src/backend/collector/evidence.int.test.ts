import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { sql } from "@/backend/db/client";
import { collectEvidence } from "./evidence";

// Every search comes back empty, as when Bright Data hits a bot check.
vi.mock(import("./brightdata"), () => ({
  serp: vi.fn(async () => []),
  unlock: vi.fn(),
  openBrowser: vi.fn(),
}));
vi.mock(import("./license"), async (importOriginal) => ({
  ...(await importOriginal()),
  findLicense: vi.fn(async () => null),
}));

const L = "00000000-0000-4000-8000-0000000015b1";

beforeAll(async () => {
  await sql`insert into listings (id, insurer, plan, city, state, name, source_url, booking_url, booking_source)
    values (${L}, 'Cigna', 'Cigna Open Access Plus', 'San Diego', 'CA', 'Ro Emptyrun',
      'https://directory.test/15b1', 'https://practice.test/book', 'practice_site')`;
  await sql`insert into evidence (listing_id, source, url, raw_text)
    values (${L}, 'practice_site', 'https://practice.test/', 'Taking new clients. We accept Cigna.')`;
});
afterAll(async () => {
  await sql`delete from listings where id = ${L}`;
});

it("keeps the last evidence and booking link when a run finds nothing", async () => {
  expect(await collectEvidence(L)).toBe(0);

  const ev = await sql`select url from evidence where listing_id = ${L}`;
  expect(ev.map((r) => r.url)).toEqual(["https://practice.test/"]);
  const [l] = await sql`select booking_url from listings where id = ${L}`;
  expect(l.booking_url).toBe("https://practice.test/book");
});
