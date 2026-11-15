// Throwaway spike for issue 02. Run: npx tsx --env-file=.env.local collector/smoke.ts
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openBrowser, serp, unlock } from "./brightdata";

const shots = join(tmpdir(), "theracheck-smoke");
mkdirSync(shots, { recursive: true });

async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  check: (r: T) => string,
) {
  const t = Date.now();
  try {
    const r = await fn();
    console.log(
      `PASS ${label} ${((Date.now() - t) / 1000).toFixed(1)}s ${check(r)}`,
    );
  } catch (e) {
    console.log(
      `FAIL ${label} ${((Date.now() - t) / 1000).toFixed(1)}s ${(e as Error).message.slice(0, 200)}`,
    );
  }
}

// Cigna guest search, San Diego 92101, Licensed Therapists, plan Open Access Plus (OAP).
// Found by clicking through: ZIP -> Doctor by Type -> Behavioral Health Counselor -> Continue as guest
// -> Skip -> View Results (Licensed Therapists) -> Continue -> Open Access Plus. The URL opens directly.
export const CIGNA_RESULTS =
  "https://hcpdirectory.cigna.com/web/public/consumer/directory/cbh-providers?city=San%20Diego&zipCode=92101&stateCode=CA&country=US&formattedAddress=San%20Diego,%20CA%2092101&latitude=32.72162107&longitude=-117.1611869&searchLocation=San%20Diego,%20CA%2092101&county=San%20diego&numberOfCounties=1&providerGroupCode=B&clinicalSpecialtyCode1=DD,TO,TH,AA,AI,AF,AM,AB,AG,AT,AR,BP,BF,BD,BR,CD,CE,DL,DB,DS,DV,ED,EC,CC,FB,FY,FI,FR,GA,GI,AX,DR,GF,GT,HV,LD,MC,ML,MO,MI,NT,OC,PM,PA,PH,MH,PT,MJ,MM,PS,PD,SI,SD,SO,GL,TM,WI&specialtyCode=BN,CN,PJ,SW&categoryId=15801&title=Licensed%20Therapists&providerGroupCodes=B&searchCategoryType=doctor-type&searchCategoryCode=HSC02&searchTerm=Behavioral%20Health%20Counselor&consumerCode=HDC001&behavioralProductCode=MHSR&behavioralNetworkCode=6&behavioralEcnCode=MHSR6&medicalProductCode=OAP&medicalEcnCode=OA001";

const pages = [
  "https://www.psychologytoday.com/us/therapists/aetna/ca/san-diego",
  "https://www.zocdoc.com/doctor/rachel-day-lmft-559379", // found via SERP; /therapists 404s
  "https://headway.co/therapists/california/san-diego",
];

async function main() {
  const only = process.argv[2];

  if (!only || only === "browser") {
    await timed(
      "browser cigna",
      async () => {
        const browser = await openBrowser();
        try {
          const page = await browser.newPage();
          await page.goto(CIGNA_RESULTS, { timeout: 120_000 });
          await page
            .getByText(/In-Network results/)
            .first()
            .waitFor({ timeout: 60_000 });
          await page.screenshot({
            path: join(shots, "cigna-results.png"),
            fullPage: true,
          });
          const text = await page.innerText("body");
          const phones = (text.match(/\(\d{3}\) \d{3}-\d{4}/g) ?? []).length;
          if (phones < 20)
            throw new Error(`only ${phones} phone numbers on the first page`);
          return {
            total: text.match(/([\d,]+) In-Network results/)?.[1],
            phones,
          };
        } finally {
          await browser.close();
        }
      },
      (r) =>
        `${r.total} in-network therapists, ${r.phones} phone numbers on page 1`,
    );
  }

  if (!only || only === "unlock") {
    for (const url of pages) {
      await timed(
        `unlock ${new URL(url).host}`,
        async () => {
          const html = await unlock(url);
          const title = html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() ?? "?";
          // a 200 can still be a bot challenge or a 404 page
          if (
            /browser check|not found|access denied|just a moment/i.test(title)
          )
            throw new Error(`got "${title}"`);
          return `${html.length} bytes title="${title.slice(0, 80)}"`;
        },
        (r) => r,
      );
    }
  }

  if (!only || only === "serp") {
    await timed(
      "serp google",
      () => serp("Rachel Day LMFT therapist San Diego"),
      (r) => `${r.length} results, first: ${r[0]?.title ?? "none"}`,
    );
  }

  console.log(`screenshots: ${shots}`);
}

main();
