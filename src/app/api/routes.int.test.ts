import { afterAll, describe, expect, it, vi } from "vitest";
import { sql } from "@/backend/db/client";
import { GET as listings } from "./listings/route";
import { GET as detail } from "./listings/[id]/route";
import { POST as recheck } from "./listings/[id]/recheck/route";
import { GET as job } from "./jobs/[id]/route";
import { GET as stats } from "./stats/route";
import { POST as callResult } from "./calls/result/route";
import { POST as callStart } from "./calls/start/route";

const base = "http://localhost/api";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const SECRET = process.env.CALLS_WEBHOOK_SECRET!;

async function newListing() {
  const insurer = `RouteCo ${crypto.randomUUID()}`;
  const [row] = await sql`
    insert into listings (insurer, plan, city, state, name, source_url)
    values (${insurer}, 'Test Plan', 'San Diego', 'CA', 'Lee Route', 'https://example.com/r')
    returning id`;
  await sql`
    insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason)
    values (${row.id}, 'yes', 'yes', 'yes', 100, 'test')`;
  return { id: row.id as string, insurer };
}

afterAll(async () => {
  await sql`delete from listings where insurer like 'RouteCo %'`;
});

const post = (body: unknown, secret: string | null = SECRET) =>
  callResult(
    new Request(`${base}/calls/result`, {
      method: "POST",
      headers: secret === null ? {} : { "x-webhook-secret": secret },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("GET /api/listings", () => {
  it("returns the 12 seeded listings in descending score, case-insensitively", async () => {
    const res = await listings(
      new Request(`${base}/listings?insurer=aetna&city=san%20diego`),
    );
    expect(res.status).toBe(200);
    const rows = await res.json();
    expect(rows).toHaveLength(12);
    const scores = rows.map((r: { score: number }) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("returns only the Spanish-speaking fixtures for language=spanish", async () => {
    const res = await listings(
      new Request(
        `${base}/listings?insurer=aetna&city=san%20diego&language=spanish`,
      ),
    );
    const body = await res.json();
    expect(body.map((r: { id: string }) => r.id).sort()).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000003",
    ]);
  });

  it("rejects a missing insurer or city with 400", async () => {
    expect(
      (await listings(new Request(`${base}/listings?city=x`))).status,
    ).toBe(400);
  });
});

describe("GET /api/listings/[id]", () => {
  it("returns the detail for a known id", async () => {
    const id = "00000000-0000-4000-8000-000000000004";
    const res = await detail(new Request(`${base}/listings/${id}`), ctx(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listing.id).toBe(id);
    expect(body.calls).toHaveLength(1);
    expect(body).toMatchObject({ score: 100, label: "Demo call: available" });
  });

  it("returns 404 for an unknown or malformed id", async () => {
    for (const id of [crypto.randomUUID(), "abc"]) {
      const res = await detail(new Request(`${base}/listings/${id}`), ctx(id));
      expect(res.status).toBe(404);
    }
  });
});

describe("GET /api/stats", () => {
  it("returns counts that sum to the total", async () => {
    const res = await stats(
      new Request(`${base}/stats?insurer=Aetna&city=San%20Diego`),
    );
    const s = await res.json();
    expect(s.total).toBe(12);
    expect(s.likelyAvailable + s.unclear + s.likelyDeadEnd).toBe(12);
  });

  it("rejects a missing insurer or city with 400", async () => {
    expect((await stats(new Request(`${base}/stats?insurer=x`))).status).toBe(
      400,
    );
  });
});

describe("POST /api/listings/[id]/recheck and GET /api/jobs/[id]", () => {
  it("two rechecks in a row return the same jobId, and the job reads as queued", async () => {
    const { id } = await newListing();
    const req = () =>
      new Request(`${base}/listings/${id}/recheck`, { method: "POST" });
    const a = await (await recheck(req(), ctx(id))).json();
    const b = await (await recheck(req(), ctx(id))).json();
    expect(a.jobId).toEqual(expect.any(String));
    expect(b.jobId).toBe(a.jobId);
    const res = await job(new Request(`${base}/jobs/${a.jobId}`), ctx(a.jobId));
    expect(await res.json()).toEqual({ status: "queued" });
  });

  it("returns 404 for an unknown listing or job", async () => {
    const id = crypto.randomUUID();
    const r = await recheck(
      new Request(`${base}/listings/${id}/recheck`, { method: "POST" }),
      ctx(id),
    );
    expect(r.status).toBe(404);
    expect((await job(new Request(`${base}/jobs/${id}`), ctx(id))).status).toBe(
      404,
    );
  });
});

describe("POST /api/calls/result", () => {
  it("returns 401 without the secret or with a wrong one, even for a bad body", async () => {
    expect((await post({}, null)).status).toBe(401);
    expect((await post({}, "wrong")).status).toBe(401);
    expect((await post({}, SECRET + "x")).status).toBe(401);
    expect((await post("not json", "")).status).toBe(401);
  });

  it("returns 400 for values outside yes|no|unknown and for bad bodies", async () => {
    const { id } = await newListing();
    for (const body of [
      { listingId: id, takesPlan: "maybe", acceptingNew: "no" },
      { listingId: id, takesPlan: "no", acceptingNew: null },
      { listingId: id, takesPlan: "no", acceptingNew: "no", summary: 5 },
      { listingId: "x", takesPlan: "no", acceptingNew: "no" },
      { takesPlan: "no", acceptingNew: "no" },
      "not json",
      [],
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    const [{ n }] =
      await sql`select count(*)::int as n from calls where listing_id = ${id}`;
    expect(n).toBe(0);
  });

  it("returns 404 for an unknown listing", async () => {
    const res = await post({
      listingId: crypto.randomUUID(),
      takesPlan: "no",
      acceptingNew: "no",
    });
    expect(res.status).toBe(404);
  });

  it("a both-no call returns score 0, moves the listing to the bottom, and leaves verdicts alone", async () => {
    const { id, insurer } = await newListing();
    const other = await sql`
      insert into listings (insurer, plan, city, state, name, source_url)
      values (${insurer}, 'Test Plan', 'San Diego', 'CA', 'No Verdict', 'https://example.com/n')
      returning id`;
    const res = await post({
      listingId: id,
      takesPlan: "no",
      acceptingNew: "no",
      summary: "Not taking anyone.",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      score: 0,
      label: "Demo call: unavailable",
    });

    const list = await (
      await listings(
        new Request(
          `${base}/listings?insurer=${encodeURIComponent(insurer)}&city=San%20Diego`,
        ),
      )
    ).json();
    expect(list.map((r: { id: string }) => r.id)).toEqual([other[0].id, id]);
    const [v] = await sql`select score from verdicts where listing_id = ${id}`;
    expect(v.score).toBe(100);
  });
});

describe("opting out of calls", () => {
  const TEAMMATE = "+16195550123";

  async function listingWithPhone() {
    const { id } = await newListing();
    const phone = `(760) 555-${String(Date.now()).slice(-4)}`;
    await sql`update listings set phone = ${phone} where id = ${id}`;
    return { id, digits: `760555${phone.slice(-4)}` };
  }

  afterAll(async () => {
    await sql`delete from do_not_call where phone like '760555%'`;
  });

  it("an opt-out result adds the listing's phone to do_not_call and still returns the score", async () => {
    const { id, digits } = await listingWithPhone();
    const res = await post({
      listingId: id,
      takesPlan: "unknown",
      acceptingNew: "unknown",
      summary: "Opted out of calls.",
    });
    expect(res.status).toBe(200);
    expect(Object.keys(await res.json()).sort()).toEqual(["label", "score"]);
    const rows =
      await sql`select phone from do_not_call where phone = ${digits}`;
    expect(rows).toHaveLength(1);

    // A second opt-out for the same phone is not an error.
    const again = await post({
      listingId: id,
      takesPlan: "unknown",
      acceptingNew: "unknown",
      summary: "Opted out of calls.",
    });
    expect(again.status).toBe(200);
  });

  it("any other summary leaves do_not_call alone", async () => {
    const { id, digits } = await listingWithPhone();
    await post({
      listingId: id,
      takesPlan: "yes",
      acceptingNew: "yes",
      summary: "They take it. Opted out of calls.",
    });
    const rows =
      await sql`select phone from do_not_call where phone = ${digits}`;
    expect(rows).toHaveLength(0);
  });

  it("calls/start then refuses that listing with 403 and places no call", async () => {
    const { id } = await listingWithPhone();
    await post({
      listingId: id,
      takesPlan: "unknown",
      acceptingNew: "unknown",
      summary: "Opted out of calls.",
    });
    // The database client also uses fetch: pass it through, and answer ElevenLabs without calling it.
    const realFetch = globalThis.fetch;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) =>
        String(input).includes("elevenlabs")
          ? Promise.resolve(Response.json({ success: true, callSid: "CA1" }))
          : realFetch(input, init),
      );
    vi.stubEnv("DEMO_CALL_ALLOWLIST", TEAMMATE);
    vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
    vi.stubEnv("NEXT_ELEVENLABS_AGENT_ID", "agent_test_id");
    vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "phnum_test_id");
    try {
      const res = await callStart(
        new Request(`${base}/calls/start`, {
          method: "POST",
          body: JSON.stringify({ listingId: id, toNumber: TEAMMATE }),
        }),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "This office asked not to be called.",
      });
      expect(
        fetchSpy.mock.calls.some(([url]) => String(url).includes("elevenlabs")),
      ).toBe(false);
      const [{ n }] =
        await sql`select count(*)::int as n from calls where listing_id = ${id} and status = 'in_progress'`;
      expect(n).toBe(0);
    } finally {
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
