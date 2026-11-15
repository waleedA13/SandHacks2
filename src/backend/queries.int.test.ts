import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "@/backend/db/client";
import {
  claimCallSlot,
  enqueueRecheck,
  failCall,
  getCallTarget,
  getDetail,
  getJob,
  getStats,
  listSummaries,
  recordCall,
} from "@/backend/queries";

// Each test gets its own insurer so rows added here never touch the seed or other tests.
async function newListing(facts?: [string, string, string], webScore = 50) {
  const insurer = `TestCo ${crypto.randomUUID()}`;
  const [row] = await sql`
    insert into listings (insurer, plan, city, state, name, source_url)
    values (${insurer}, 'Test Plan', 'San Diego', 'CA', 'Pat Test', 'https://example.com/t')
    returning id`;
  if (facts)
    await sql`
      insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason)
      values (${row.id}, ${facts[0]}, ${facts[1]}, ${facts[2]}, ${webScore}, 'test reason')`;
  return { id: row.id as string, insurer };
}

// Cascades to verdicts, evidence, calls and jobs, so db/seed.int.test.ts still counts 12.
afterAll(async () => {
  await sql`delete from listings where insurer like 'TestCo %'`;
});

const webScore = async (id: string) =>
  (await sql`select score from verdicts where listing_id = ${id}`)[0].score;

describe("listSummaries", () => {
  it("returns the 12 seeded Aetna listings in descending final score", async () => {
    const rows = await listSummaries("Aetna", "San Diego");
    expect(rows).toHaveLength(12);
    const scores = rows.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("matches insurer and city case-insensitively", async () => {
    expect(await listSummaries("aetna", "SAN DIEGO")).toHaveLength(12);
  });

  it("shows a listing with no verdict as score 50, Unclear", async () => {
    const { insurer } = await newListing();
    const [row] = await listSummaries(insurer, "san diego");
    expect(row).toMatchObject({ score: 50, label: "Unclear", call: null });
  });

  it("includes the latest done call", async () => {
    const [row] = (await listSummaries("Aetna", "San Diego")).filter(
      (r) => r.id === "00000000-0000-4000-8000-000000000004",
    );
    expect(row.score).toBe(100);
    expect(row.call).toMatchObject({ takesPlan: "yes", acceptingNew: "yes" });
    expect(typeof row.call?.calledAt).toBe("string");
  });

  it("filters by specialty, language and telehealth", async () => {
    const ids = (r: { id: string }[]) => r.map((x) => x.id).sort();
    expect(
      ids(await listSummaries("Aetna", "San Diego", { specialty: "GRIEF" })),
    ).toEqual([
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000010",
    ]);
    expect(
      ids(
        await listSummaries("Aetna", "San Diego", {
          language: "spanish",
          telehealth: "yes",
        }),
      ),
    ).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });

  it("combines specialty and language with AND", async () => {
    const rows = await listSummaries("Aetna", "San Diego", {
      specialty: "anxiety",
      language: "spanish",
    });
    expect(rows.map((r) => r.id)).toEqual([
      "00000000-0000-4000-8000-000000000001",
    ]);
    expect(rows[0]).toMatchObject({
      specialties: ["anxiety", "depression"],
      languages: ["spanish"],
      selfPayMin: 150,
      selfPayMax: 180,
      licenseStatus: "active",
    });
  });

  it("excludes unknown telehealth when filtering on telehealth yes", async () => {
    const rows = await listSummaries("Aetna", "San Diego", {
      telehealth: "yes",
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.telehealth === "yes")).toBe(true);
  });
});

describe("recordCall and the final score", () => {
  it("a both-no call makes the final score 0 and leaves verdicts.score alone", async () => {
    const { id, insurer } = await newListing(["yes", "yes", "yes"], 100);
    const result = await recordCall({
      listingId: id,
      takesPlan: "no",
      acceptingNew: "no",
      summary: "full",
    });
    expect(result).toEqual({ score: 0, label: "Demo call: unavailable" });
    const [row] = await listSummaries(insurer, "San Diego");
    expect(row).toMatchObject({ score: 0, label: "Demo call: unavailable" });
    expect(await webScore(id)).toBe(100);
  });

  it("rewriting the verdict with a new web score keeps the call's final score", async () => {
    const { id, insurer } = await newListing(["yes", "yes", "yes"], 100);
    await recordCall({ listingId: id, takesPlan: "no", acceptingNew: "no" });
    await sql`update verdicts set score = 85, accepting_new = 'unknown' where listing_id = ${id}`;
    const [row] = await listSummaries(insurer, "San Diego");
    expect(row.score).toBe(0);
  });

  it("a both-yes call gives 100", async () => {
    const { id } = await newListing(["no", "no", "no"], 0);
    expect(
      await recordCall({
        listingId: id,
        takesPlan: "yes",
        acceptingNew: "yes",
      }),
    ).toEqual({ score: 100, label: "Demo call: available" });
  });

  it("uses the latest done call and ignores calls that are not done", async () => {
    const { id, insurer } = await newListing(["yes", "yes", "yes"], 100);
    await recordCall({ listingId: id, takesPlan: "no", acceptingNew: "no" });
    await recordCall({ listingId: id, takesPlan: "yes", acceptingNew: "yes" });
    await sql`insert into calls (listing_id, status, takes_plan, accepting_new) values (${id}, 'failed', 'no', 'no')`;
    const [row] = await listSummaries(insurer, "San Diego");
    expect(row.label).toBe("Demo call: available");
  });

  it("on equal scores, a call result ranks as the stronger evidence", async () => {
    const insurer = `TestCo ${crypto.randomUUID()}`;
    const ids: Record<string, string> = {};
    for (const [name, fact] of [
      ["A web top", "yes"],
      ["B call top", "no"],
      ["C web bottom", "no"],
      ["D call bottom", "yes"],
    ]) {
      const [row] = await sql`
        insert into listings (insurer, plan, city, state, name, source_url)
        values (${insurer}, 'P', 'San Diego', 'CA', ${name}, 'https://example.com/o')
        returning id`;
      await sql`
        insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason)
        values (${row.id}, ${fact}, ${fact}, ${fact}, 0, 'r')`;
      ids[name] = row.id;
    }
    const yes = { takesPlan: "yes", acceptingNew: "yes" } as const;
    const no = { takesPlan: "no", acceptingNew: "no" } as const;
    await recordCall({ listingId: ids["B call top"], ...yes });
    await recordCall({ listingId: ids["D call bottom"], ...no });
    const names = (await listSummaries(insurer, "San Diego")).map(
      (r) => r.name,
    );
    expect(names).toEqual([
      "B call top",
      "A web top",
      "C web bottom",
      "D call bottom",
    ]);
  });

  it("returns null for an unknown listing", async () => {
    expect(
      await recordCall({
        listingId: crypto.randomUUID(),
        takesPlan: "yes",
        acceptingNew: "yes",
      }),
    ).toBeNull();
  });
});

describe("getDetail", () => {
  it("returns listing, verdict, final score, trimmed evidence and calls", async () => {
    const d = await getDetail("00000000-0000-4000-8000-000000000001");
    expect(d?.listing.name).toBe("Avery Example");
    expect(d?.verdict?.score).toBe(100);
    expect(d).toMatchObject({ score: 100, label: "Likely available" });
    expect(d?.evidence.length).toBeGreaterThan(0);
    expect(Object.keys(d!.evidence[0]).sort()).toEqual([
      "fetchedAt",
      "rawText",
      "source",
      "url",
    ]);
    expect(d?.calls).toEqual([]);
  });

  it("cuts evidence text to 300 characters", async () => {
    const { id } = await newListing();
    await sql`insert into evidence (listing_id, source, url, raw_text) values (${id}, 'zocdoc', 'https://example.com/z', ${"x".repeat(500)})`;
    const d = await getDetail(id);
    expect(d?.evidence[0].rawText).toHaveLength(300);
    expect(d).toMatchObject({ verdict: null, score: 50, label: "Unclear" });
  });

  it("returns null for an unknown or malformed id", async () => {
    expect(await getDetail(crypto.randomUUID())).toBeNull();
    expect(await getDetail("not-a-uuid")).toBeNull();
  });
});

describe("getStats", () => {
  it("buckets the seeded listings by final score", async () => {
    const s = await getStats("aetna", "san diego");
    expect(s.total).toBe(12);
    expect(s.likelyAvailable + s.unclear + s.likelyDeadEnd).toBe(12);
    expect(s.deadEndPct).toBe(Math.round((s.likelyDeadEnd / 12) * 100));
    expect(Number.isInteger(s.deadEndPct)).toBe(true);
  });

  it("counts a call-overridden listing by its final score", async () => {
    const { id, insurer } = await newListing(["yes", "yes", "yes"], 100);
    await recordCall({ listingId: id, takesPlan: "no", acceptingNew: "no" });
    expect(await getStats(insurer, "San Diego")).toEqual({
      total: 1,
      likelyAvailable: 0,
      unclear: 0,
      likelyDeadEnd: 1,
      deadEndPct: 100,
    });
  });

  it("returns zeroes for an empty area", async () => {
    expect(await getStats("Nobody", "Nowhere")).toEqual({
      total: 0,
      likelyAvailable: 0,
      unclear: 0,
      likelyDeadEnd: 0,
      deadEndPct: 0,
    });
  });
});

describe("enqueueRecheck and getJob", () => {
  it("a second recheck returns the existing queued job", async () => {
    const { id } = await newListing();
    const first = await enqueueRecheck(id);
    expect(first).toEqual(expect.any(String));
    expect(await enqueueRecheck(id)).toBe(first);
    expect(await getJob(first!)).toEqual({ status: "queued" });
  });

  it("reuses a running job and starts a new one after it finishes", async () => {
    const { id } = await newListing();
    const first = (await enqueueRecheck(id))!;
    await sql`update jobs set status = 'running' where id = ${first}`;
    expect(await enqueueRecheck(id)).toBe(first);
    await sql`update jobs set status = 'done' where id = ${first}`;
    expect(await enqueueRecheck(id)).not.toBe(first);
  });

  it("returns null for unknown ids", async () => {
    expect(await enqueueRecheck(crypto.randomUUID())).toBeNull();
    expect(await getJob(crypto.randomUUID())).toBeNull();
    expect(await getJob("nope")).toBeNull();
  });
});

describe("getCallTarget", () => {
  it("returns only the name and insurer, never the phone", async () => {
    const t = await getCallTarget("00000000-0000-4000-8000-000000000001");
    expect(Object.keys(t!).sort()).toEqual(["insurer", "name", "optedOut"]);
    expect(t!.insurer).toBe("Aetna");
    expect(t!.optedOut).toBe(false);
  });

  it("flags a listing whose phone opted out, whatever the formatting", async () => {
    const digits = String(Date.now()).slice(-7);
    const [a, b] = await sql`
      insert into listings (insurer, plan, city, state, name, phone, source_url)
      values ('TestCo optout', 'P', 'San Diego', 'CA', 'A', ${`(858) ${digits.slice(0, 3)}-${digits.slice(3)}`}, 'https://example.com/a'),
             ('TestCo optout', 'P', 'San Diego', 'CA', 'B', ${`+1 858 ${digits}`}, 'https://example.com/b')
      returning id`;
    await recordCall({
      listingId: a.id,
      takesPlan: "unknown",
      acceptingNew: "unknown",
      summary: "Opted out of calls.",
    });
    expect((await getCallTarget(a.id))!.optedOut).toBe(true);
    expect((await getCallTarget(b.id))!.optedOut).toBe(true);
    await sql`delete from do_not_call where phone = ${`858${digits}`}`;
  });

  it("returns null for unknown or malformed ids", async () => {
    expect(await getCallTarget(crypto.randomUUID())).toBeNull();
    expect(await getCallTarget("nope")).toBeNull();
  });
});

describe("claimCallSlot and failCall", () => {
  // The slot is global, so age out any outbound call another test started.
  beforeEach(async () => {
    await sql`update calls set called_at = now() - interval '61 seconds'
              where status = 'in_progress'`;
  });

  it("records an in_progress call and refuses a second within 60 seconds", async () => {
    const a = await newListing();
    const b = await newListing();
    const id = await claimCallSlot(a.id);
    expect(id).toEqual(expect.any(String));
    const [row] =
      await sql`select listing_id, status from calls where id = ${id}`;
    expect(row).toEqual({ listing_id: a.id, status: "in_progress" });
    expect(await claimCallSlot(b.id)).toBeNull();
  });

  it("frees the slot once the call is older than 60 seconds", async () => {
    const { id: listing } = await newListing();
    const first = await claimCallSlot(listing);
    await sql`update calls set called_at = now() - interval '61 seconds' where id = ${first}`;
    expect(await claimCallSlot(listing)).not.toBeNull();
  });

  it("frees the slot when the call failed to start", async () => {
    const { id: listing } = await newListing();
    const first = await claimCallSlot(listing);
    await failCall(first!);
    const [row] = await sql`select status from calls where id = ${first}`;
    expect(row.status).toBe("failed");
    expect(await claimCallSlot(listing)).not.toBeNull();
  });

  it("does not change the listing's score", async () => {
    const { id, insurer } = await newListing(["yes", "yes", "yes"], 100);
    const before = (await listSummaries(insurer, "San Diego"))[0];
    await claimCallSlot(id);
    expect((await listSummaries(insurer, "San Diego"))[0]).toEqual(before);
  });
});
