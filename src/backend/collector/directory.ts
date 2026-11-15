// Scrape Cigna's public directory into `listings`. Run by hand, once per city:
// npx tsx --env-file=.env.local src/backend/collector/directory.ts --insurer "Cigna" --zip 92101 --limit 50
import { parseArgs } from "node:util";
import type { Page, Response } from "@playwright/test";
import { sql } from "@/backend/db/client";
import type { Listing } from "@/shared/types";
import { openBrowser } from "./brightdata";
import { normalizeName, normalizePhone } from "./normalize";
import { lookupNpi } from "./npi";

const CITY_BY_ZIP: Record<string, string> = {
  "92101": "San Diego",
  "90012": "Los Angeles",
  "94102": "San Francisco",
  "95113": "San Jose",
  "95814": "Sacramento",
  "93721": "Fresno",
};

// Results URLs found by clicking through the site (docs/smoke-test.md). Other ZIPs need
// the same click-through once to learn the latitude, longitude and county the site uses.
const RESULTS_URL: Record<string, string> = {
  "92101":
    "https://hcpdirectory.cigna.com/web/public/consumer/directory/cbh-providers?city=San%20Diego&zipCode=92101&stateCode=CA&country=US&formattedAddress=San%20Diego,%20CA%2092101&latitude=32.72162107&longitude=-117.1611869&searchLocation=San%20Diego,%20CA%2092101&county=San%20diego&numberOfCounties=1&providerGroupCode=B&clinicalSpecialtyCode1=DD,TO,TH,AA,AI,AF,AM,AB,AG,AT,AR,BP,BF,BD,BR,CD,CE,DL,DB,DS,DV,ED,EC,CC,FB,FY,FI,FR,GA,GI,AX,DR,GF,GT,HV,LD,MC,ML,MO,MI,NT,OC,PM,PA,PH,MH,PT,MJ,MM,PS,PD,SI,SD,SO,GL,TM,WI&specialtyCode=BN,CN,PJ,SW&categoryId=15801&title=Licensed%20Therapists&providerGroupCodes=B&searchCategoryType=doctor-type&searchCategoryCode=HSC02&searchTerm=Behavioral%20Health%20Counselor&consumerCode=HDC001&behavioralProductCode=MHSR&behavioralNetworkCode=6&behavioralEcnCode=MHSR6&medicalProductCode=OAP&medicalEcnCode=OA001",
};

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
      providers = await providersFrom(page, () =>
        page.getByRole("button", { name: "Next page" }).click(),
      );
    }
    return found;
  } finally {
    await browser.close();
  }
}

// Booking link and line type stay at their column defaults until #46 fills them.
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

const identity = (insurer: string, name: string, phone: string | null) =>
  `${insurer}|${normalizeName(name)}|${phone ? normalizePhone(phone) : ""}`;

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
  const city = CITY_BY_ZIP[zip];
  if (!city) throw new Error(`ZIP ${zip} is not one of the six target cities`);
  const url = RESULTS_URL[zip];
  if (!url)
    throw new Error(
      `No Cigna results URL recorded for ${zip} yet; see docs/smoke-test.md`,
    );

  const scraped = await scrape(url, limit);
  console.log(`scraped ${scraped.length} listings from ${insurer}`);

  const existing = new Map<string, string>();
  const rows = await sql`
    select id, name, phone from listings
    where insurer = ${insurer} and source_url not like 'https://example.com/%'`;
  for (const r of rows) existing.set(identity(insurer, r.name, r.phone), r.id);

  for (const { provider, sourceUrl } of scraped) {
    const l = toListing(provider, sourceUrl, insurer, city);
    if (provider.firstName && provider.lastName)
      l.npi = await lookupNpi(
        provider.firstName,
        provider.lastName,
        city,
        STATE,
      );
    const key = identity(insurer, l.name, l.phone);
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
