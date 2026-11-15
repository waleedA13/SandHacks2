import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "@/lib/db";
import { scoreVerdict } from "@/lib/score";
import { extractFacts } from "./gemini";
import { verifyListing } from "./verify";

vi.mock("./gemini", () => ({ extractFacts: vi.fn() }));
const mocked = vi.mocked(extractFacts);

// Own rows, removed afterwards, so the seed fixtures stay as they are.
const WITH = "00000000-0000-4000-8000-0000000009a1";
const WITHOUT = "00000000-0000-4000-8000-0000000009a2";

const verdictRow = async (id: string) =>
  (await sql`select * from verdicts where listing_id = ${id}`)[0];

beforeAll(async () => {
  await sql`insert into listings (id, insurer, plan, city, state, name, source_url) values
    (${WITH}, 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Pat Verifytest', 'https://example.com/d/a1'),
    (${WITHOUT}, 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Lee Noevidence', 'https://example.com/d/a2')`;
  await sql`insert into evidence (listing_id, source, url, raw_text) values
    (${WITH}, 'practice_site', 'https://example.com/pat', 'Not taking new clients.'),
    (${WITH}, 'psychology_today', 'https://example.com/pt/pat', 'Insurance: Aetna.')`;
});

beforeEach(async () => {
  mocked.mockReset();
  await sql`delete from verdicts where listing_id in (${WITH}, ${WITHOUT})`;
  await sql`insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason, checked_at, specialties)
    values (${WITH}, 'unknown', 'unknown', 'unknown', 50, 'Old reason.', '2020-01-01', '{anxiety}')`;
});

afterAll(async () => {
  await sql`delete from listings where id in (${WITH}, ${WITHOUT})`;
});

describe("verifyListing", () => {
  it("writes all unknown, score 50 and the fixed reason without calling Gemini when there is no evidence", async () => {
    const v = await verifyListing(WITHOUT);
    expect(mocked).not.toHaveBeenCalled();
    expect(v).toMatchObject({
      listingId: WITHOUT,
      stillPractising: "unknown",
      listsInsurer: "unknown",
      acceptingNew: "unknown",
      score: 50,
      reason: "We found no other information about this listing.",
    });
    expect((await verdictRow(WITHOUT)).score).toBe(50);
  });

  it("sends the listing's name, insurer and evidence to extractFacts", async () => {
    mocked.mockResolvedValue({
      stillPractising: "yes",
      listsInsurer: "yes",
      acceptingNew: "no",
      reason: "Their own website says they are not taking new clients.",
    });
    await verifyListing(WITH);
    expect(mocked).toHaveBeenCalledWith({
      name: "Pat Verifytest",
      insurer: "Aetna",
      evidence: expect.arrayContaining([
        { source: "practice_site", text: "Not taking new clients." },
        { source: "psychology_today", text: "Insurance: Aetna." },
      ]),
    });
  });

  it("scores yes, no, unknown with scoreVerdict and upserts the row", async () => {
    const facts = {
      stillPractising: "yes",
      listsInsurer: "no",
      acceptingNew: "unknown",
    } as const;
    mocked.mockResolvedValue({
      ...facts,
      reason: "Their own website says they only take self-pay.",
    });

    const v = await verifyListing(WITH);
    const row = await verdictRow(WITH);

    expect(v.score).toBe(scoreVerdict(facts).score);
    expect(row).toMatchObject({
      still_practising: "yes",
      lists_insurer: "no",
      accepting_new: "unknown",
      score: scoreVerdict(facts).score,
      reason: "Their own website says they only take self-pay.",
    });
    expect(new Date(row.checked_at).getFullYear()).toBeGreaterThan(2020);
    // Columns the verifier does not own are left alone.
    expect(row.specialties).toEqual(["anxiety"]);
  });

  it("cuts a reason longer than 140 characters to 140", async () => {
    mocked.mockResolvedValue({
      stillPractising: "yes",
      listsInsurer: "yes",
      acceptingNew: "yes",
      reason: "x".repeat(200),
    });
    const v = await verifyListing(WITH);
    expect(v.reason).toHaveLength(140);
    expect((await verdictRow(WITH)).reason).toHaveLength(140);
  });

  it("throws and keeps the old verdict when Gemini fails", async () => {
    mocked.mockRejectedValue(new Error("Gemini did not return JSON."));
    await expect(verifyListing(WITH)).rejects.toThrow(
      "Gemini did not return JSON.",
    );
    expect(await verdictRow(WITH)).toMatchObject({
      score: 50,
      reason: "Old reason.",
    });
  });

  it("throws for a listing that does not exist", async () => {
    await expect(
      verifyListing("00000000-0000-4000-8000-0000000009ff"),
    ).rejects.toThrow(/not found/);
  });
});
