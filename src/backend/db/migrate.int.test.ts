import { execFileSync, spawnSync } from "node:child_process";
import { afterAll, expect, it } from "vitest";
import { sql } from "@/backend/db/client";

const TSX = "node_modules/tsx/dist/cli.mjs";
const migrate = (...args: string[]) =>
  spawnSync(process.execPath, [TSX, "src/backend/db/migrate.ts", ...args], {
    encoding: "utf8",
  });

const counts = () => sql`
  select (select count(*)::int from listings) as listings,
         (select count(*)::int from verdicts) as verdicts,
         (select count(*)::int from calls) as calls`;

// The test drops the new columns, so put the seed back for the other files.
afterAll(() => {
  execFileSync(
    process.execPath,
    [TSX, "--env-file=.env.test", "src/backend/db/reset.ts", "--local-only"],
    { stdio: "ignore" },
  );
});

it("refuses to run without an env file", () => {
  const run = migrate();
  expect(run.status).not.toBe(0);
  expect(run.stderr).toMatch(/env file/i);
});

it("adds the columns to a pre-migration database and is safe to run twice", async () => {
  await sql`alter table listings drop column booking_url, drop column booking_source, drop column phone_line_type`;
  await sql`alter table verdicts drop column sees_self_pay`;
  await sql`alter table calls drop column source`;
  const before = await counts();

  for (let i = 0; i < 2; i++) {
    const run = migrate(".env.test");
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
  }

  expect(await counts()).toEqual(before);
  const cols = await sql`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and table_name in ('listings', 'verdicts', 'calls')
      and column_name in ('booking_url', 'booking_source', 'phone_line_type', 'sees_self_pay', 'source')
    order by table_name, column_name`;
  expect(cols.map((c) => `${c.table_name}.${c.column_name}`)).toEqual([
    "calls.source",
    "listings.booking_source",
    "listings.booking_url",
    "listings.phone_line_type",
    "verdicts.sees_self_pay",
  ]);
  const [row] = await sql`
    select (select count(*)::int from listings where phone_line_type = 'unknown') as unknown_lines,
           (select count(*)::int from calls where source = 'agent') as agent_calls`;
  expect(row.unknown_lines).toBe(before[0].listings);
  expect(row.agent_calls).toBe(before[0].calls);
});
