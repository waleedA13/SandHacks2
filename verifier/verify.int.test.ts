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
import { extractFacts, type Facts } from "./gemini";
import { verifyListing } from "./verify";

vi.mock(import("./gemini"), async (importOriginal) => ({
  ...(await importOriginal()),
  extractFacts: vi.fn(),
}));
const mocked = vi.mocked(extractFacts);

// Own rows, removed afterwards, so the seed fixtures stay as they are.
const WITH = "00000000-0000-4000-8000-0000000009a1";
const WITHOUT = "00000000-0000-4000-8000-0000000009a2";
const BOARD = "00000000-0000-4000-8000-0000000009a3";

const base: Facts = {
  stillPractising: "yes",
  listsInsurer: "yes",
  acceptingNew: "yes",
  reason: "Their own website says they are taking new clients.",
  specialties: [],
  languages: [],
  telehealth: "unknown",
  selfPayMin: null,
  selfPayMax: null,
  licenseStatus: "unchecked",
  licenseDiscipline: "unknown",
};
const run = async (id: string, extra: Partial<Facts>) => {
  mocked.mockResolvedValue({ ...base, ...extra });
  await verifyListing(id);
  return verdictRow(id);
};

const verdictRow = async (id: string) =>
  (await sql`select * from verdicts where listing_id = ${id}`)[0];

beforeAll(async () => {
  await sql`insert into listings (id, insurer, plan, city, state, name, source_url) values
    (${WITH}, 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Pat Verifytest', 'https://example.com/d/a1'),
    (${WITHOUT}, 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Lee Noevidence', 'https://example.com/d/a2'),
    (${BOARD}, 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Sam Boardtest', 'https://example.com/d/a3')`;
  await sql`insert into evidence (listing_id, source, url, raw_text) values
    (${WITH}, 'practice_site', 'https://example.com/pat', 'Not taking new clients.'),
    (${WITH}, 'psychology_today', 'https://example.com/pt/pat', 'Insurance: Aetna.'),
    (${BOARD}, 'license_board', 'https://example.com/board/sam', 'License status: Current/Active. No public discipline.')`;
});

beforeEach(async () => {
  mocked.mockReset();
  await sql`delete from verdicts where listing_id in (${WITH}, ${WITHOUT}, ${BOARD})`;
  await sql`insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason, checked_at,
      specialties, self_pay_min, self_pay_max, license_status, license_discipline)
    values (${WITH}, 'unknown', 'unknown', 'unknown', 50, 'Old reason.', '2020-01-01',
      '{anxiety}', 100, 100, 'active', 'yes')`;
});

afterAll(async () => {
  await sql`delete from listings where id in (${WITH}, ${WITHOUT}, ${BOARD})`;
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
    expect(await verdictRow(WITHOUT)).toMatchObject({
      score: 50,
      specialties: [],
      languages: [],
      telehealth: "unknown",
      self_pay_min: null,
      self_pay_max: null,
      license_status: "unchecked",
      license_discipline: "unknown",
    });
  });

  it("sends the listing's name, insurer and evidence to extractFacts", async () => {
    mocked.mockResolvedValue({
      ...base,
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
      ...base,
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
  });

  it("saves the fit, fee and licence facts without changing the score", async () => {
    const row = await run(BOARD, {
      specialties: ["anxiety", "grief"],
      languages: ["spanish"],
      telehealth: "yes",
      selfPayMin: 80,
      selfPayMax: 160,
      licenseStatus: "active",
      licenseDiscipline: "no",
    });
    expect(row).toMatchObject({
      score: scoreVerdict(base).score,
      specialties: ["anxiety", "grief"],
      languages: ["spanish"],
      telehealth: "yes",
      self_pay_min: 80,
      self_pay_max: 160,
      license_status: "active",
      license_discipline: "no",
    });
  });

  it("drops a specialty outside the fixed list before saving", async () => {
    const row = await run(WITH, {
      specialties: ["anxiety", "ocd", "Depression", "anxiety"],
    });
    expect(row.specialties).toEqual(["anxiety", "depression"]);
  });

  it("saves languages lower-case, without English, duplicates or junk", async () => {
    const row = await run(WITH, {
      languages: [" Spanish ", "english", "spanish", "Call 555-0100 now!"],
    });
    expect(row.languages).toEqual(["spanish"]);
  });

  it("swaps selfPayMin and selfPayMax when reversed", async () => {
    const row = await run(WITH, { selfPayMin: 160, selfPayMax: 80 });
    expect(row).toMatchObject({ self_pay_min: 80, self_pay_max: 160 });
  });

  it("lets one stated price set both ends", async () => {
    const row = await run(WITH, { selfPayMin: null, selfPayMax: 150 });
    expect(row).toMatchObject({ self_pay_min: 150, self_pay_max: 150 });
  });

  it.each([
    [-50, 100],
    [0, 100],
    [80, 5000],
    [99.5, 120],
  ])("saves no fee when a value is impossible (%s, %s)", async (min, max) => {
    const row = await run(WITH, { selfPayMin: min, selfPayMax: max });
    expect(row).toMatchObject({ self_pay_min: null, self_pay_max: null });
  });

  it("forces licence facts to unchecked and unknown without license_board evidence, whatever Gemini says", async () => {
    const row = await run(WITH, {
      licenseStatus: "active",
      licenseDiscipline: "yes",
    });
    expect(row).toMatchObject({
      license_status: "unchecked",
      license_discipline: "unknown",
    });
  });

  it("cuts a reason longer than 140 characters to 140", async () => {
    mocked.mockResolvedValue({
      ...base,
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
