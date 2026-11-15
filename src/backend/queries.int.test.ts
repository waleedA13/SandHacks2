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
  listSearchOptions,
  listSummaries,
  recordCall,
  recordReport,
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

describe("listSearchOptions", () => {
  it("returns the seed's insurers and cities, sorted, and each insurer's first city", async () => {
    const o = await listSearchOptions();
    // Other tests add "TestCo …" insurers; the seed has only Aetna in San Diego.
    expect(o.insurers.filter((i) => !i.startsWith("TestCo "))).toEqual([
      "Aetna",
    ]);
    expect(o.cities).toEqual(["San Diego"]);
    expect(o.firstCity.Aetna).toBe("San Diego");
  });

  it("gives each insurer the first city it has listings in", async () => {
    const insurer = `TestCo ${crypto.randomUUID()}`;
    for (const city of ["Fresno", "Chula Vista"])
      await sql`
        insert into listings (insurer, plan, city, state, name, source_url)
        values (${insurer}, 'P', ${city}, 'CA', 'Pat Test', 'https://example.com/c')`;
    const o = await listSearchOptions();
    expect(o.firstCity[insurer]).toBe("Chula Vista");
    expect(o.firstCity.Aetna).toBe("San Diego");
  });
});

describe("listSummaries by ZIP code", () => {
  const ids = (r: { id: string }[]) => r.map((x) => x.id);

  it("matches a five-digit ZIP inside the address", async () => {
    expect(ids(await listSummaries("Aetna", "92103"))).toEqual([
      "00000000-0000-4000-8000-000000000003",
    ]);
    expect(await listSummaries("Aetna", "92101")).toHaveLength(2);
  });

  it("matches only the whole ZIP", async () => {
    expect(await listSummaries("Aetna", "9210")).toEqual([]);
    expect(await listSummaries("Aetna", "192103")).toEqual([]);
  });

  it("trims the value and caps it at 60 characters", async () => {
    expect(ids(await listSummaries("Aetna", "  92103 "))).toEqual([
      "00000000-0000-4000-8000-000000000003",
    ]);
    expect(await listSummaries("Aetna", "San Diego" + "x".repeat(500))).toEqual(
      [],
    );
  });

  it("still matches a city name ignoring case", async () => {
    expect(await listSummaries("aetna", "san diego")).toHaveLength(12);
  });

  it("getStats counts the ZIP's listings", async () => {
    expect((await getStats("Aetna", "92103")).total).toBe(1);
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

describe("self-pay and caller reports in the final score", () => {
  it("labels a listing off the plan that sees self-pay clients Pay yourself, score unchanged", async () => {
    const { id, insurer } = await newListing(["unknown", "no", "unknown"], 25);
    await sql`update verdicts set sees_self_pay = 'yes' where listing_id = ${id}`;
    const [row] = await listSummaries(insurer, "San Diego");
    expect(row).toMatchObject({
      score: 25,
      label: "Pay yourself",
      seesSelfPay: "yes",
    });
    expect(await getDetail(id)).toMatchObject({
      score: 25,
      label: "Pay yourself",
    });
  });

  it("labels the latest done caller report Caller reported", async () => {
    const { id, insurer } = await newListing(["yes", "yes", "yes"], 100);
    await sql`insert into calls (listing_id, status, takes_plan, accepting_new, source)
      values (${id}, 'done', 'yes', 'no', 'caller')`;
    const [row] = await listSummaries(insurer, "San Diego");
    expect(row).toMatchObject({
      score: 0,
      label: "Caller reported: unavailable",
    });
    expect((await getDetail(id))?.label).toBe("Caller reported: unavailable");
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
  it("returns only the name, insurer and line type, never the phone", async () => {
    const t = await getCallTarget("00000000-0000-4000-8000-000000000001");
    expect(Object.keys(t!).sort()).toEqual([
      "insurer",
      "lineType",
      "name",
      "optedOut",
    ]);
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

const SEED = (n: number) =>
  `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

describe("booking paths and source count", () => {
  it("returns each path combination on the seed data", async () => {
    const rows = await listSummaries("Aetna", "San Diego");
    const paths = (n: number) => rows.find((r) => r.id === SEED(n))?.paths;
    expect(paths(1)).toEqual(["book_online", "agent_check", "call_yourself"]);
    expect(paths(2)).toEqual(["agent_check", "call_yourself"]);
    expect(paths(4)).toEqual(["call_yourself"]);
  });

  it("never offers agent_check for a listing that is not a landline", async () => {
    const rows = await listSummaries("Aetna", "San Diego");
    for (const r of rows.filter((r) => r.phoneLineType !== "landline"))
      expect(r.paths).not.toContain("agent_check");
  });

  it("gives a listing with no phone and no link no paths", async () => {
    const { insurer } = await newListing();
    const [row] = await listSummaries(insurer, "San Diego");
    expect(row.paths).toEqual([]);
  });

  it("returns paths and sourceCount on the detail too", async () => {
    const d = await getDetail(SEED(1));
    // Three evidence sources plus the directory.
    expect(d).toMatchObject({
      sourceCount: 4,
      paths: ["book_online", "agent_check", "call_yourself"],
    });
  });
});

describe("recordReport", () => {
  const backdate = (id: string) =>
    sql`update calls set called_at = called_at - interval '2 minutes' where listing_id = ${id}`;

  it("stores a done caller call with no reporter data", async () => {
    const { id } = await newListing(["unknown", "unknown", "unknown"]);
    await recordReport(id, "yes", "yes");
    const rows = await sql`select * from calls where listing_id = ${id}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "done",
      source: "caller",
      takes_plan: "yes",
      accepting_new: "yes",
      summary: "Reported by someone who called.",
    });
    // The calls table holds no reporter column: no IP, cookie or user agent.
    expect(Object.keys(rows[0]).sort()).toEqual([
      "accepting_new",
      "called_at",
      "id",
      "listing_id",
      "source",
      "status",
      "summary",
      "takes_plan",
    ]);
  });

  it("yes/yes gives Caller reported: available", async () => {
    const { id } = await newListing(["unknown", "unknown", "unknown"]);
    expect(await recordReport(id, "yes", "yes")).toEqual({
      score: 100,
      label: "Caller reported: available",
    });
  });

  it("yes/no gives Caller reported: unavailable", async () => {
    const { id } = await newListing(["yes", "yes", "yes"]);
    expect(await recordReport(id, "yes", "no")).toEqual({
      score: 0,
      label: "Caller reported: unavailable",
    });
  });

  it("answered yes but openings unknown stores takesPlan unknown and leaves the web label", async () => {
    const { id } = await newListing(["yes", "yes", "unknown"]);
    expect(await recordReport(id, "yes", "unknown")).toEqual({
      score: 85,
      label: "Likely available",
    });
    const [c] =
      await sql`select takes_plan from calls where listing_id = ${id}`;
    expect(c.takes_plan).toBe("unknown");
  });

  it("nobody answered: stores unknowns and changes nothing until the third in 7 days", async () => {
    const { id } = await newListing(["yes", "yes", "yes"]);
    const web = { score: 100, label: "Likely available" };
    expect(await recordReport(id, "no", "yes")).toEqual(web);
    const [c] =
      await sql`select takes_plan, accepting_new, summary from calls where listing_id = ${id}`;
    expect(c).toEqual({
      takes_plan: "unknown",
      accepting_new: "unknown",
      summary: "Someone called and nobody answered.",
    });
    await backdate(id);
    expect(await recordReport(id, "no", "unknown")).toEqual(web);
    await backdate(id);
    expect(await recordReport(id, "no", "unknown")).toEqual({
      score: 0,
      label: "Caller reported: unavailable",
    });
  });

  it("no-answers older than 7 days do not count", async () => {
    const { id } = await newListing(["yes", "yes", "yes"]);
    for (let i = 0; i < 2; i++) {
      await recordReport(id, "no", "unknown");
      await sql`update calls set called_at = called_at - interval '8 days' where listing_id = ${id}`;
    }
    expect(await recordReport(id, "no", "unknown")).toMatchObject({
      label: "Likely available",
    });
  });

  it("a no-answer does not hide an earlier answered report", async () => {
    const { id } = await newListing(["unknown", "unknown", "unknown"]);
    await recordReport(id, "yes", "yes");
    await backdate(id);
    expect(await recordReport(id, "no", "unknown")).toEqual({
      score: 100,
      label: "Caller reported: available",
    });
  });

  it("an answered report after three no-answers wins", async () => {
    const { id } = await newListing(["unknown", "unknown", "unknown"]);
    for (let i = 0; i < 3; i++) {
      await recordReport(id, "no", "unknown");
      await backdate(id);
    }
    expect(await recordReport(id, "yes", "yes")).toMatchObject({
      label: "Caller reported: available",
    });
  });

  it("refuses a second report for the same listing within 60 seconds", async () => {
    const { id } = await newListing();
    await recordReport(id, "yes", "yes");
    expect(await recordReport(id, "yes", "no")).toBe("too_soon");
    const [{ n }] =
      await sql`select count(*)::int as n from calls where listing_id = ${id}`;
    expect(n).toBe(1);
  });

  it("does not hold the slot for other listings", async () => {
    const a = await newListing();
    const b = await newListing();
    await recordReport(a.id, "yes", "yes");
    expect(await recordReport(b.id, "yes", "yes")).not.toBe("too_soon");
  });

  it("returns null for an unknown or malformed listing", async () => {
    expect(await recordReport(crypto.randomUUID(), "yes", "yes")).toBeNull();
    expect(await recordReport("nope", "yes", "yes")).toBeNull();
  });
});
