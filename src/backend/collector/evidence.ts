// Finds what the public web says about each listed therapist and stores the page text in `evidence`.
// Run: npx tsx --env-file=.env.local src/backend/collector/evidence.ts --all | --listing <id>
import { pathToFileURL } from "node:url";
import { sql } from "@/backend/db/client";
import type { EvidenceSource } from "@/shared/types";
import { type Booking, bestBooking, findBooking } from "./booking";
import { serp, unlock } from "./brightdata";
import { findLicense } from "./license";
import { isSamePerson, normalizeName } from "./match";

const FIXTURE_PREFIX = "https://example.com/";
const MAX_TEXT = 8000;
// Each candidate costs one Web Unlocker request.
const CANDIDATES_PER_SOURCE = 2;
// Bright Data requests made by this process, for the spend log.
let requests = 0;

type Row = {
  id: string;
  name: string;
  credential: string | null;
  phone: string | null;
  npi: string | null;
  licenceNumber?: string | null;
  city: string;
  state: string;
  source_url: string;
};
type Found = {
  source: EvidenceSource;
  url: string;
  rawText: string;
  booking?: Booking | null;
};

// Directories, social sites and insurers: never a therapist's own practice site.
const NOT_PRACTICE_SITES = new Set(
  "psychologytoday.com zocdoc.com headway.co google.com yelp.com healthgrades.com linkedin.com facebook.com instagram.com twitter.com x.com youtube.com tiktok.com npiregistry.cms.hhs.gov npidb.org npino.com hipaaspace.com cigna.com aetna.com anthem.com blueshieldca.com kaiserpermanente.org webmd.com vitals.com sharecare.com doximity.com helloalma.com growtherapy.com mapquest.com yellowpages.com bbb.org indeed.com glassdoor.com therapyden.com goodtherapy.org betterhelp.com talkspace.com theravive.com opencounseling.com psychcentral.com wikipedia.org reddit.com findatopdoc.com caduceus.org bizapedia.com usnews.com md.com castleconnolly.com".split(
    " ",
  ),
);
const isDirectory = (host: string) =>
  [...NOT_PRACTICE_SITES].some((d) => host === d || host.endsWith(`.${d}`));

const sources: {
  name: string;
  source: (url: string) => EvidenceSource | null;
  query: (l: Row) => string;
}[] = [
  {
    name: "psychology_today",
    source: (url) =>
      /psychologytoday\.com\/us\/therapists\/.+\/\d+/.test(url)
        ? "psychology_today"
        : null,
    query: (l) => `${l.name} ${l.city} ${l.state} psychology today`,
  },
  {
    name: "practice_site",
    source: (url) => (isDirectory(new URL(url).host) ? null : "practice_site"),
    query: (l) =>
      `${l.name} ${l.credential ?? ""} therapist ${l.city} ${l.state}`,
  },
  {
    name: "zocdoc_or_headway",
    source: (url) =>
      /zocdoc\.com\/doctor\//.test(url)
        ? "zocdoc"
        : /headway\.co\/providers\//.test(url)
          ? "headway"
          : null,
    query: (l) => `${l.name} therapist ${l.city} zocdoc headway`,
  },
];

// Many SERP links are google.com/goto?url=… redirects whose url is an opaque token, not an address.
function isPageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host !== "google.com" && !host.endsWith(".google.com");
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  mdash: "—",
  ndash: "—",
};

// One pass, so "&amp;lt;" becomes "&lt;" and is not decoded twice.
function decode(s: string): string {
  return s.replace(/&(#\d+|\w+);/g, (_, e: string) =>
    e.startsWith("#")
      ? String.fromCharCode(Number(e.slice(1)))
      : (ENTITIES[e] ?? " "),
  );
}

function stripHtml(html: string): string {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

// Names come from the title, headings and JSON-LD, split on the separators sites put around them.
function pageNames(html: string): string[] {
  const bits = [
    ...html.matchAll(/<(title|h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi),
  ].map((m) => stripHtml(m[2]));
  bits.push(
    ...[...html.matchAll(/"name"\s*:\s*"([^"]{3,80})"/g)].map((m) => m[1]),
  );
  return bits
    .flatMap((b) => b.split(/[|,:\-–—•·()]/))
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2 && s.length <= 60);
}

function pagePhones(text: string, html: string): string[] {
  const re = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  return [...(text.match(re) ?? []), ...(html.match(/tel:[^"']+/g) ?? [])];
}

// A 200 can still be a bot check or a 404 page. Psychology Today's bot check sometimes passes on a second try.
async function fetchPage(url: string, retry = true): Promise<string> {
  requests++;
  const html = await unlock(url);
  const title = html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() ?? "";
  if (retry && /browser check/i.test(title)) return fetchPage(url, false);
  if (/browser check|not found|access denied|just a moment/i.test(title))
    throw new Error(`got "${title}"`);
  return html;
}

// The SERP zone sometimes answers 502; Bright Data bans retrying that query for 15 s.
async function search(query: string, retry = true) {
  requests++;
  try {
    return await serp(query);
  } catch (e) {
    if (!retry) throw e;
    await new Promise((r) => setTimeout(r, 16_000));
    return search(query, false);
  }
}

async function trySource(
  l: Row,
  nameIsUnique: boolean,
  { name, source, query }: (typeof sources)[number],
): Promise<Found | null> {
  const label = `${l.name} ${name}`;
  let urls: { url: string; source: EvidenceSource }[];
  try {
    urls = (await search(query(l)))
      .map((r) => r.url)
      .filter(isPageUrl)
      .flatMap((url) => {
        const s = source(url);
        return s ? [{ url, source: s }] : [];
      })
      .slice(0, CANDIDATES_PER_SOURCE);
  } catch (e) {
    console.log(`${label}: failed (search) ${(e as Error).message}`);
    return null;
  }
  if (!urls.length) {
    console.log(`${label}: no match (no candidate pages)`);
    return null;
  }

  const matches: Found[] = [];
  const errors: string[] = [];
  for (const { url, source } of urls) {
    try {
      const html = await fetchPage(url);
      // Site menus and footers list cities (Headway links every big city), so the city test skips them.
      const text = stripHtml(
        html.replace(/<(header|nav|footer)[\s>][\s\S]*?<\/\1>/gi, " "),
      );
      const page = {
        names: pageNames(html),
        phones: pagePhones(stripHtml(html), html),
        text,
      };
      if (isSamePerson({ ...l, nameIsUnique }, page))
        matches.push({
          source,
          url,
          rawText: text.slice(0, MAX_TEXT),
          // Full html: "Book now" buttons usually sit in the header the text drops.
          booking: findBooking(source, url, html),
        });
    } catch (e) {
      errors.push(`${url} ${(e as Error).message.slice(0, 120)}`);
    }
  }

  // Two pages on one site (say Home and About) are the same candidate.
  const hosts = new Set(matches.map((m) => new URL(m.url).host));
  if (hosts.size === 1) {
    console.log(`${label}: matched ${matches[0].url}`);
    return matches[0];
  }
  if (errors.length === urls.length)
    console.log(`${label}: failed ${errors.join("; ")}`);
  else
    console.log(
      `${label}: no match (${hosts.size ? `${hosts.size} sites matched, ambiguous` : `${urls.length} candidates checked`})${errors.length ? `, failed ${errors.join("; ")}` : ""}`,
    );
  return null;
}

export async function collectEvidence(listingId: string): Promise<number> {
  const [l] = (await sql`
    select id, name, credential, phone, npi, city, state, source_url
    from listings where id = ${listingId}`) as Row[];
  if (!l) throw new Error(`listing ${listingId} not found`);
  if (l.source_url.startsWith(FIXTURE_PREFIX)) {
    console.log(`${l.name}: skipped, fixture listing`);
    return 0;
  }

  const names = (await sql`select name from listings`) as { name: string }[];
  const name = normalizeName(l.name);
  const nameIsUnique =
    names.filter((n) => normalizeName(n.name) === name).length === 1;

  const lookUpLicence = async (profileText?: string) => {
    try {
      return await findLicense(l, profileText);
    } catch (e) {
      console.log(`${l.name} license_board: failed ${(e as Error).message}`);
      return null;
    }
  };
  // Looked up first so pages can be matched on the board-confirmed licence number.
  const early = await lookUpLicence();
  const withLicence = { ...l, licenceNumber: early?.number ?? null };

  const found = (
    await Promise.all(
      sources.map((s) => trySource(withLicence, nameIsUnique, s)),
    )
  ).filter((f): f is Found => f !== null);

  {
    const licence =
      early ??
      (await lookUpLicence(
        found.find((f) => f.source === "psychology_today")?.rawText,
      ));
    console.log(`${l.name} license_board: ${licence ? "matched" : "no match"}`);
    if (licence)
      found.push({
        source: "license_board",
        url: licence.url,
        rawText: licence.rawText,
      });
  }

  // A run that finds nothing is usually a bot check or a flaky search, not proof the pages are gone.
  if (!found.length) {
    console.log(`${l.name}: nothing found, kept the last evidence`);
    return 0;
  }

  const booking = bestBooking(found.map((f) => f.booking ?? null));
  console.log(
    `${l.name} booking: ${booking ? `${booking.source} ${booking.url}` : "none"}`,
  );
  await sql.transaction([
    sql`update listings set booking_url = ${booking?.url ?? null},
          booking_source = ${booking?.source ?? null} where id = ${l.id}`,
    sql`delete from evidence where listing_id = ${l.id}`,
    ...found.map(
      (f) =>
        sql`insert into evidence (listing_id, source, url, raw_text)
            values (${l.id}, ${f.source}, ${f.url}, ${f.rawText})`,
    ),
  ]);
  return found.length;
}

async function main(args: string[]) {
  const i = args.indexOf("--listing");
  const ids = args.includes("--all")
    ? (
        (await sql`
          select id from listings
          where source_url not like ${FIXTURE_PREFIX + "%"}
          order by scraped_at`) as { id: string }[]
      ).map((r) => r.id)
    : i >= 0 && args[i + 1]
      ? [args[i + 1]]
      : [];
  if (!ids.length) {
    console.error(
      "Usage: tsx src/backend/collector/evidence.ts --all | --listing <id>",
    );
    process.exit(2);
  }

  let next = 0;
  let withEvidence = 0;
  let failed = 0;
  // At most 5 listings at once.
  await Promise.all(
    Array.from({ length: Math.min(5, ids.length) }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          if ((await collectEvidence(id)) > 0) withEvidence++;
        } catch (e) {
          failed++;
          console.error(`${id}: FAILED ${(e as Error).message}`);
        }
      }
    }),
  );
  console.log(
    `${withEvidence} of ${ids.length} listings have evidence${failed ? `, ${failed} failed` : ""}, ${requests} Bright Data requests`,
  );
  if (failed) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  await main(process.argv.slice(2));
