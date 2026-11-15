# Bright Data smoke test (issue 02)

**Chosen insurer: Cigna**, plan **Open Access Plus (OAP)**, San Diego 92101, "Licensed Therapists". Guest search, no login. 8,000 in-network results; 20 listings per page, each with name, address and phone.

Run: `npx tsx --env-file=.env.local src/backend/collector/smoke.ts [browser|unlock|serp]`. Results from 2026-11-14.

## 1. Browser API on insurer directories

| Insurer                   | Result      | Seconds | Notes                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aetna                     | **Blocked** | –       | The public search (`health.aetna.com/ahpublic/...`) is disallowed by Aetna's robots.txt, and Bright Data refuses those URLs unless the account passes their KYC check. The old `dsepublic` URL is a 404.                                                                                                                                                 |
| Cigna                     | **Pass**    | 15–17   | 20 phone numbers on page 1, 8,000 total. Stopped here, as the issue says.                                                                                                                                                                                                                                                                                |
| Blue Shield of California | **Fail**    | 70–120  | After accepting the tracking pop-up (with the user's OK): ZIP and plan pickers work, but a "psychologist" search never shows results; the location resets when "Search all plans" is chosen. A site banner says Blue Shield Behavioral Health has run the behavioral health benefit since 1 Jan 2026, so therapists may not be in this directory at all. |
| Anthem                    | **Fail**    | 150–180 | Guest search works up to the results page, then the list spins forever. No provider-search request is ever sent (3 tries, waits up to 40 s).                                                                                                                                                                                                             |

**Working search steps (Cigna).** Click-through, about 2.5 minutes through the Browser API:

1. Open `https://hcpdirectory.cigna.com/web/public/consumer/directory`, choose **Employer or School**. (Healthcare.gov/Direct Purchase has no medical plans in San Diego.)
2. Type `92101` in "Enter Address, City, or Zip", pick "San Diego, CA 92101".
3. **Doctor by Type** → **Behavioral Health Counselor** → **Submit search**.
4. **Continue as guest** → **Skip** (the "primarily treats" question).
5. **View 8000 Results** under Licensed Therapists → **Continue** → **Open Access Plus, Open Access Plus Tiered**.

**Shortcut:** the final results URL opens directly in about 16 seconds, skipping all the clicks. It is `CIGNA_RESULTS` in `src/backend/collector/smoke.ts`. Other plans swap `medicalProductCode`/`medicalEcnCode` in that URL.

**Anthem steps, for the record.** `https://findcare.anthem.com/` (wait about 15 s for it to render) → **Basic search as a guest** → plan type **Medical Plan or Network** → state **California** → **Medical (Employer-Sponsored)** → plan **Advantage PPO** → **Continue** → **Update Location** `92101` → **Behavioral Health**. The dropdowns are type-ahead fields, not `<select>`s. Anthem also links a [machine-readable provider directory](https://www22.anthem.com/cms-data-index.json/index.html), a possible no-scraping source not tested here.

**Blue Shield notes.** The search-bar fields (`#location`, `#choose-plan`, `#searchSpclty`) only respond to clicks made through page JavaScript; Playwright reports the ZIP box as hidden even when it is on screen.

Page-driving notes for issue 03: plan options and "View … Results" are `<button>`s, not links. The search box's button is named "Submit search"; a plain "Search" button belongs to the site-wide search. Fields are found by placeholder, not label.

## 2. Web Unlocker

| Page                                                  | Result   | Seconds | What came back                                                                                                                                                |
| ----------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Psychology Today, `/us/therapists/aetna/ca/san-diego` | **Fail** | 1.9     | HTTP 200, but the page is the bot check "A quick browser check, then you're on your way." Same on every retry. Try the Browser API for this site, or drop it. |
| Zocdoc profile, `/doctor/rachel-day-lmft-559379`      | Pass     | 22–42   | Full profile, 574 KB. Slow. `/therapists` and `/therapists/san-diego-ca` are 404 pages.                                                                       |
| Headway, `/therapists/california/san-diego`           | Pass     | 2–6     | Full listing page, 1.3 MB                                                                                                                                     |

## 3. SERP API

| Query                                       | Result                | Seconds  | What came back                                                             |
| ------------------------------------------- | --------------------- | -------- | -------------------------------------------------------------------------- |
| `Rachel Day LMFT therapist San Diego`       | Pass, 4 of 4 runs     | 1.7–13.4 | 9–10 organic results with title and link                                   |
| `"Rachel Day" therapist San Diego` (quoted) | **Fail**, 4 of 5 runs | 0.4–3.4  | `502 Proxy Error` or `redirect location was rejected`, then `429` for 15 s |

## What issue 03 and 04 need to know

- **Use the Cigna results URL directly** and page through it; don't replay the clicks.
- **Don't put quotes in SERP queries.** Unquoted name searches worked every time.
- **Some SERP links are `google.com/goto?url=…` redirects**, not the real page URL.
- **Errors come back as HTTP 200.** The real status is in the `x-brd-error` and `x-brd-status-code` response headers. `src/backend/collector/brightdata.ts` turns those into thrown errors.
- **SERP parsed JSON:** add `brd_json=1` to the Google URL with `format: "raw"`. `format: "json"` returned HTML.
- **A 200 from Web Unlocker can still be a bot-check page.** Check the page title before trusting it.

## Evidence collector run (issue 04, GitHub #8), 2026-11-14

Ran `src/backend/collector/evidence.ts --listing <id>` on the first 20 real Cigna San Diego listings (5 at a time), not `--all`, to cap spend.

- **Requests: 187 Bright Data requests in total** (SERP + Web Unlocker, including debugging and re-runs after two matching fixes). The CLI prints the count per run. A full run averages about 6 requests per listing. Failed SERP requests are not billed (Bright Data SERP error catalog). Dollar cost not checked; see the Bright Data dashboard.
- **Coverage: 7 of 20 listings (35%) have evidence**: Psychology Today 4, practice site 4, Zocdoc/Headway 0. Below the issue's 50% target.
- **Why so low:** about half the listings are clinicians at telehealth companies or ABA groups (402 W Broadway, 501 W Broadway) with no page of their own. Most SERP links after the first two are `google.com/goto?url=<opaque token>` redirects that cannot be followed, so they are skipped. Psychology Today still shows its bot check on some fetches after one retry. SERP returns 502 on about 1 in 10 queries; a retry must wait 15 s (`failed_query_rejected`).
- **Headway profiles list "San Diego, CA" in their menu links**, so the city test ignores `<header>`, `<nav>` and `<footer>` text. Before this fix, a New York nurse practitioner's Headway profile matched a San Diego listing with the same name.

## Licence lookup (issue 22, GitHub #22), 2026-11-15

**The board's search can't be automated with our setup.** Bright Data's Browser API and Web Unlocker both refuse `https://search.dca.ca.gov/` with `Forbidden: target site requires is a government site and requires special permissions`, and lifting that needs their KYC check (https://brightdata.com/cp/kyc), the same block as Aetna. The search form also uses a Cloudflare Turnstile check.

**Used instead: DCA's monthly public licensee files, plus licence numbers from the NPI Registry and Psychology Today.** The files are linked from https://www.dca.ca.gov/consumers/public_info/index.shtml and stored in a public Box folder (https://dca.box.com/s/oss6hf8jys2bmgxqd2gdz7w4oepm2il9). They are tab-separated text despite the `.xls` name. DCA refreshes them at the start of each month; ours are from 2026-11. To refresh, download into `data/`, which is gitignored:

- `BehavioralSciences_0200/BehavioralSciences_Data00.xls`: LMFT, LCSW, LPCC and associates (36 MB).
- `Psychology_0600/Psychology_Data00.xls` (4.4 MB).
- `RegisteredNursing_0400/RegisteredNursing_Data00.xls` and `_Data01.xls` (214 MB together). Keep only the header and the `Nurse Practitioner` and `Clinical Nurse Specialist` rows, as `data/RegisteredNursing_NP.xls` (12 MB). For example: `cat Data00 Data01 | awk -F'\t' 'NR==1 || $4=="Nurse Practitioner" || $4=="Clinical Nurse Specialist"' | awk '!(NR>1 && /^Agency Code/)'`.

The Medical and Osteopathic Board files are not used, because no listing is an MD or DO. California does not license BCBAs or LBAs, so those listings are not checked.

**Matching, in order. Each step keeps the issue's rule: one licensee, never the closest.**

1. **Licence number.** Numbers come from the NPI Registry and from the Psychology Today profile ("Licensed by State of California / LMFT 37318"). For listings with no NPI, the NPI comes from a statewide name search, accepted only when exactly one result practises in the listing's city or answers its phone. The NPI is then saved to `listings.npi`. A record is accepted when it has that number, the listing's licence type, and the same first and last name. Two such records of one type means no match.
2. **Name and place.** Exactly one same-name, same-type licensee statewide, whose address of record is in the listing's city or county.

- **Limits.** No disciplinary actions and no per-person record link. The files list only `Current`, `CurrentInactive` and `Delinquent` licences, so revoked or cancelled licences are absent, and a missing match means "could not match", never "unlicensed". The address of record is often a home or mailing address.
- **Evidence row.** `url` is `https://search.dca.ca.gov/`. `raw_text` has the board, licence type and number, name, city, county, issue and expiry dates, and the status. It says discipline is not included and how the match was made. The street address is left out on purpose.
- **Run.** `npx tsx --env-file=.env.local src/backend/collector/license.ts` rewrites only `license_board` rows for every real listing. It makes about 300 NPI Registry calls and no Bright Data requests. `collectEvidence` also runs it as a fourth source.

| City          | Listings | Licence types we can check | Matched |
| ------------- | -------- | -------------------------- | ------- |
| San Diego     | 50       | 33                         | 13      |
| Fresno        | 50       | 29                         | 15      |
| Los Angeles   | 50       | 30                         | 16      |
| Sacramento    | 50       | 48                         | 14      |
| San Francisco | 50       | 49                         | 13      |
| San Jose      | 50       | 49                         | 4       |
| **All**       | 300      | 238                        | **75**  |

75 matched, up from 33 with name and place alone. 62 matched by licence number (52 from the NPI Registry, 10 from Psychology Today) and 13 by name and place. By type: 24 nurse practitioners, 20 LMFTs, 17 LCSWs, 13 psychologists and 1 LPCC. The wider NPI search added an NPI to 7 listings (63 → 70). Files load in about 1 s; each listing takes about 0.3 s, including the NPI call and the database write.

**Consistency check.** I compared every stored match with the name-and-place rule. Where both find a record, they find the same one: 0 conflicts.

**Hand check, San Diego (first run, name and place only).** The board's search page has a CAPTCHA, so this compares Cigna's address with the board's address of record. Two match the street address exactly: Mednitsky (1420 Kettner Blvd Ste 100) and Medina (1202 Kettner Blvd Ste B). Medina's Psychology Today profile also gives the same licence number, 96724. The other six are the only licensee of that name and type in California, with an address of record in San Diego County. Number matches carry the licensee's full name from the board; six samples all had the listing's first and last name. Not yet checked against the board's own search page by a person.
