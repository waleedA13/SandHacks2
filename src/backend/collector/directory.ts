// Scrape Cigna's public directory into `listings`. Run by hand, once per city:
// npx tsx --env-file=.env.local src/backend/collector/directory.ts --insurer "Cigna" --zip 92101 --limit 50
import { parseArgs } from "node:util";
import type { Page, Response } from "@playwright/test";
import { sql } from "@/backend/db/client";
import type { Listing } from "@/shared/types";
import { openBrowser } from "./brightdata";
import { PLACES, cignaResultsUrl } from "./cigna";
import { listingKey } from "./normalize";
import { lookupNpi } from "./npi";

const PLAN = "Open Access Plus";
const STATE = "CA";

type CignaProvider = {
  providerId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  locations?: {
    streetName?: string;
    addressLine2?: string;
    city?: string;
    stateCode?: string;
    zipCode?: string;
    phones?: string[];
  }[];
};

// The page fetches each results page as JSON; read that instead of the rendered cards.
async function providersFrom(
  page: Page,
  trigger: () => Promise<unknown>,
): Promise<CignaProvider[]> {
  const isProviders = async (r: Response) =>
    r.url().includes("/directory-provider/v1/providers") &&
    Array.isArray(
      (await r.json().catch(() => null))?.searchResult?.providerGroups?.[0]
        ?.providers,
    );
  const [res] = await Promise.all([
    page.waitForResponse(isProviders, { timeout: 120_000 }),
    trigger(),
  ]);
  return (await res.json()).searchResult.providerGroups[0].providers;
}

async function scrape(
  url: string,
  limit: number,
): Promise<{ provider: CignaProvider; sourceUrl: string }[]> {
  const browser = await openBrowser();
  try {
    const page = await browser.newPage();
    await page.route("**/*", (r) =>
      ["image", "font", "media"].includes(r.request().resourceType())
        ? r.abort()
        : r.continue(),
    );
    const found: { provider: CignaProvider; sourceUrl: string }[] = [];
    let providers = await providersFrom(page, () =>
      page.goto(url, { timeout: 120_000 }),
    );
    while (providers.length > 0) {
      await page
        .locator(`a[href*="cbh-providers/${providers[0].providerId}"]`)
        .first()
        .waitFor({ timeout: 60_000 });
      const links = await page
        .locator('a[href*="cbh-providers/"]')
        .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
      for (const provider of providers) {
        const link = links.find((h) =>
          h.includes(`cbh-providers/${provider.providerId}?`),
        );
        found.push({ provider, sourceUrl: link ?? page.url() });
        if (found.length >= limit) return found;
      }
      console.log(`page done, ${found.length} listings so far`);
      const next = page.getByRole("button", { name: "Next page" });
      // On the last page the button is missing or disabled, and clicking it would hang.
      if (!(await next.count()) || (await next.first().isDisabled())) break;
      providers = await providersFrom(page, () => next.first().click());
    }
    return found;
  } finally {
    await browser.close();
  }
}

// evidence.ts fills the booking link and linetype.ts the line type, so a re-scrape never overwrites them.
function toListing(
  p: CignaProvider,
  sourceUrl: string,
  insurer: string,
  city: string,
): Omit<
  Listing,
  "id" | "scrapedAt" | "bookingUrl" | "bookingSource" | "phoneLineType"
> {
  const [name, ...credentials] = p.name.split(",").map((s) => s.trim());
  const loc = p.locations?.[0];
  const street = [loc?.streetName, loc?.addressLine2].filter(Boolean).join(" ");
  const address =
    street && loc?.city && loc.stateCode && loc.zipCode
      ? `${street}, ${loc.city}, ${loc.stateCode} ${loc.zipCode}`
      : null;
  return {
    insurer,
    plan: PLAN,
    city,
    state: STATE,
    name,
    credential: credentials.join(", ") || null,
    address,
    phone: loc?.phones?.[0] ?? null,
    npi: null,
    sourceUrl,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      insurer: { type: "string" },
      zip: { type: "string" },
      limit: { type: "string", default: "50" },
    },
  });
  const insurer = values.insurer;
  const zip = values.zip ?? "";
  const limit = Number(values.limit);
  if (insurer !== "Cigna")
    throw new Error("Only --insurer Cigna has recorded search steps");
  const city = PLACES[zip]?.city;
  if (!city) throw new Error(`ZIP ${zip} is not one of the six target cities`);

  const scraped = await scrape(cignaResultsUrl(zip), limit);
  console.log(`scraped ${scraped.length} listings from ${insurer}`);

  const existing = new Map<string, string>();
  const rows = await sql`
    select id, city, name, phone from listings
    where insurer = ${insurer} and source_url not like 'https://example.com/%'`;
  for (const r of rows)
    existing.set(listingKey(insurer, r.city, r.name, r.phone), r.id);

  for (const { provider, sourceUrl } of scraped) {
    const l = toListing(provider, sourceUrl, insurer, city);
    if (provider.firstName && provider.lastName)
      // The office's own city (La Jolla, Chula Vista…), not the search city, matches the registry.
      l.npi = await lookupNpi(
        provider.firstName,
        provider.lastName,
        provider.locations?.[0]?.city ?? city,
        STATE,
      );
    const key = listingKey(insurer, city, l.name, l.phone);
    const id = existing.get(key);
    if (id) {
      await sql`
        update listings set plan = ${l.plan}, city = ${l.city}, state = ${l.state},
          name = ${l.name}, credential = ${l.credential}, address = ${l.address},
          phone = ${l.phone}, npi = ${l.npi}, source_url = ${l.sourceUrl}, scraped_at = now()
        where id = ${id}`;
    } else {
      const [row] = await sql`
        insert into listings (insurer, plan, city, state, name, credential, address, phone, npi, source_url)
        values (${l.insurer}, ${l.plan}, ${l.city}, ${l.state}, ${l.name}, ${l.credential},
          ${l.address}, ${l.phone}, ${l.npi}, ${l.sourceUrl})
        returning id`;
      existing.set(key, row.id);
    }
    console.log(
      `${id ? "updated" : "inserted"} ${l.name} | ${l.phone ?? "no phone"} | npi ${l.npi ?? "none"}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
