// Matches listings to California licensee records and stores them as `license_board` evidence.
// Source: DCA's monthly public licensee files (https://www.dca.ca.gov/consumers/public_info/index.shtml),
// downloaded by hand into data/ (see docs/smoke-test.md). Bright Data refuses search.dca.ca.gov without KYC.
// Run: npx tsx --env-file=.env.local src/backend/collector/license.ts
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { normalizeName } from "./match";
import { npiLicences } from "./npi";

const FILES = [
  "data/BehavioralSciences_Data00.xls",
  "data/Psychology_Data00.xls",
  // Nurse Practitioner and Clinical Nurse Specialist rows only, cut from RegisteredNursing_Data00/01.xls.
  "data/RegisteredNursing_NP.xls",
];
// The files have no per-person page; the evidence text carries the licence number to look up here.
const SEARCH_URL = "https://search.dca.ca.gov/";
const FIXTURE_PREFIX = "https://example.com/";

// Listing credential -> DCA licence type. Anything else is not looked up.
const TYPES: Record<string, string> = {
  lmft: "Licensed Marriage and Family Therapist",
  lcsw: "Licensed Clinical Social Worker",
  lpcc: "Licensed Professional Clinical Counselor",
  amft: "Associate Marriage & Family Therapist",
  acsw: "Associate Clinical Social Worker",
  aswi: "Associate Clinical Social Worker",
  apcc: "Assoc. Professional Clinical Counselor",
  phd: "Psychologist",
  psyd: "Psychologist",
  np: "Nurse Practitioner",
  pmhnp: "Nurse Practitioner",
  cnp: "Nurse Practitioner",
  aprncnp: "Nurse Practitioner",
  arnp: "Nurse Practitioner",
  crnp: "Nurse Practitioner",
  cns: "Clinical Nurse Specialist",
  aprncns: "Clinical Nurse Specialist",
};

const STATUS: Record<string, string> = {
  Current: "active",
  CurrentInactive: "inactive",
  Delinquent: "inactive",
};

function licenseTypes(credential: string | null): string[] {
  return (credential ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .flatMap((c) => (TYPES[c] ? [TYPES[c]] : []));
}

type Result = {
  name: string;
  type: string;
  city: string;
  county: string;
  url: string;
};

// Safety control: exactly one same-name, same-type licensee statewide, in the listing's city or county.
// Never the closest match.
export function pickLicenseRecord<R extends Result>(
  listing: { name: string; credential: string | null; city: string },
  results: R[],
): R | null {
  const name = normalizeName(listing.name);
  const city = listing.city.trim().toUpperCase();
  // Per licence type, in credential order; any type with two same-name licensees makes the whole lookup ambiguous.
  const perType = licenseTypes(listing.credential).map((t) =>
    results.filter((r) => r.type === t && normalizeName(r.name) === name),
  );
  if (perType.some((s) => s.length > 1)) return null;
  return (
    perType.flat().find((r) => r.city === city || r.county === city) ?? null
  );
}

// Safety control: the number must belong to a licensee of the listing's type with the same first and last name.
// Any type with two such licensees makes the whole lookup ambiguous.
export function pickByLicenceNumber<R extends Result & { number: string }>(
  listing: { name: string; credential: string | null },
  numbers: string[],
  results: R[],
): R | null {
  const words = (n: string) => normalizeName(n).split(" ");
  const want = words(listing.name);
  const sameName = (r: R) => {
    const got = words(r.name);
    return got[0] === want[0] && got.at(-1) === want.at(-1);
  };
  const perType = licenseTypes(listing.credential).map((t) => [
    ...new Set(
      results.filter(
        (r) => numbers.includes(r.number) && r.type === t && sameName(r),
      ),
    ),
  ]);
  if (perType.some((s) => s.length > 1)) return null;
  return perType.flat()[0] ?? null;
}

// Psychology Today profiles show "Licensed by State of California / LMFT 37318", sometimes "/ PSY27872".
export function profileLicenceNumbers(text: string): string[] {
  return [
    ...text.matchAll(
      /Licensed by State of California \/ (?:[A-Za-z]+ ?)?(\d+)/g,
    ),
  ].map((m) => m[1]);
}

// Columns: 1 board, 3 licence type, 4 number, 6-8 last/first/middle, 12 city, 13 county, 17 issued, 18 expires, 19 status.
// The street address is left out: many are home addresses.
export function licenseText(c: string[]): string {
  return [
    `${c[1]} public licensee file (California Department of Consumer Affairs).`,
    `${c[3]} ${c[4]}: ${[c[7], c[8], c[6]].filter(Boolean).join(" ")}, ${c[12]}, ${c[13]} county.`,
    `Issued ${c[17]}, expires ${c[18]}.`,
    `Licence status: ${c[19]} (${STATUS[c[19]] ?? "unknown"}).`,
    "This file does not include disciplinary actions.",
  ].join(" ");
}

type Row = Result & { number: string; cols: string[] };
let rows: Row[] | null = null;
let byNumber: Map<string, Row[]> | null = null;
function loadRows() {
  rows ??= FILES.flatMap((f) =>
    readFileSync(f, "latin1")
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.split("\t"))
      .filter((c) => c[5] === "I")
      .map((c) => ({
        name: `${c[7]} ${c[6]}`,
        type: c[3],
        city: c[12],
        county: c[13],
        url: SEARCH_URL,
        number: c[4],
        cols: c,
      })),
  );
  if (!byNumber) {
    byNumber = new Map();
    for (const r of rows)
      byNumber.set(r.number, [...(byNumber.get(r.number) ?? []), r]);
  }
  return rows;
}

type Listing = {
  name: string;
  credential: string | null;
  city: string;
  phone: string | null;
  npi: string | null;
};

// Licence number first (NPI Registry, then the Psychology Today profile), then name and city.
// `npi` is set when the NPI came from a wider search and its licence number confirmed the match.
export async function findLicense(
  listing: Listing,
  profileText = "",
): Promise<{
  url: string;
  rawText: string;
  npi: string | null;
  number: string;
} | null> {
  loadRows();
  const fromNpi = await npiLicences(listing);
  const numbers = [
    ...(fromNpi?.numbers ?? []),
    ...profileLicenceNumbers(profileText),
  ];
  const candidates = numbers.flatMap((n) => byNumber!.get(n) ?? []);
  const byNum = pickByLicenceNumber(listing, numbers, candidates);
  const r = byNum ?? pickLicenseRecord(listing, rows!);
  if (!r) return null;
  const how = byNum
    ? `Matched by licence number ${r.number}${fromNpi?.numbers.includes(r.number) ? " from the NPI Registry" : " from the Psychology Today profile"}.`
    : "Matched by name, licence type and city or county.";
  return {
    url: r.url,
    rawText: `${licenseText(r.cols)} ${how}`,
    number: r.number,
    npi:
      !listing.npi && fromNpi?.numbers.includes(r.number) ? fromNpi.npi : null,
  };
}

// Rewrites only license_board rows, so other evidence is not re-scraped.
async function main() {
  // Imported here so tests of the matcher don't need DATABASE_URL.
  const { sql } = await import("@/backend/db/client");
  const listings = (await sql`
    select l.id, l.name, l.credential, l.city, l.phone, l.npi,
      (select raw_text from evidence e
       where e.listing_id = l.id and e.source = 'psychology_today' limit 1) as profile
    from listings l
    where l.source_url not like ${FIXTURE_PREFIX + "%"}`) as (Listing & {
    id: string;
    profile: string | null;
  })[];
  const start = Date.now();
  loadRows();
  const loaded = Date.now();
  let matched = 0;
  for (const l of listings) {
    let found: Awaited<ReturnType<typeof findLicense>> = null;
    try {
      found = await findLicense(l, l.profile ?? "");
    } catch (e) {
      console.log(`${l.name}: failed ${(e as Error).message}`);
      continue;
    }
    if (found) matched++;
    console.log(
      `${l.name} (${l.credential ?? "no credential"}): ${found ? found.rawText.split(". ").at(-1) : "no match"}`,
    );
    await sql.transaction([
      ...(found?.npi
        ? [
            sql`update listings set npi = ${found.npi} where id = ${l.id} and npi is null`,
          ]
        : []),
      sql`delete from evidence where listing_id = ${l.id} and source = 'license_board'`,
      ...(found
        ? [
            sql`insert into evidence (listing_id, source, url, raw_text)
                values (${l.id}, 'license_board', ${found.url}, ${found.rawText})`,
          ]
        : []),
    ]);
  }
  console.log(
    `${matched} of ${listings.length} listings matched a licence record. Files loaded in ${(loaded - start) / 1000}s, ${((Date.now() - loaded) / 1000 / Math.max(1, listings.length)).toFixed(3)}s per listing including NPI Registry calls and the database write.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
