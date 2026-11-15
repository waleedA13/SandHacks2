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

**Shortcut:** the final results URL opens directly in about 16 seconds, skipping all the clicks. It is `CIGNA_RESULTS` in `src/backend/collector/smoke.ts`. Other plans swap `medicalProductCode`/`medicalEcnCode` in that URL. Other cities swap the place fields (city, ZIP, latitude, longitude, county); `src/backend/collector/cigna.ts` builds the URL for all six.

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

**Hand check, San Diego (first run, name and place only).** The board's search page has a CAPTCHA, so this compares Cigna's address with the board's address of record. Two match the street address exactly: Mednitsky (1420 Kettner Blvd Ste 100) and Medina (1202 Kettner Blvd Ste B). Medina's Psychology Today profile also gives the same licence number, 96724. The other six are the only licensee of that name and type in California, with an address of record in San Diego County. Number matches carry the licensee's full name from the board; six samples all had the listing's first and last name.

**Hand check on the board's own site (2026-11-15).** Five stored records were looked up on `search.dca.ca.gov` in a normal browser; Cloudflare's check passed without a click. All five match our evidence row on name, licence type, number, status and expiry date, and none shows the "public record or disciplinary action" flag.

| Listing                             | Matched by              | Board record                                                                                             |
| ----------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Ada M Valladares, LCSW, Los Angeles | NPI licence number      | LCSW 79279, renewed & current, expires 2027-08-31, Los Angeles                                           |
| Alexa Brozick, PMHNP, Sacramento    | NPI licence number      | NP 95031608, current, expires 2027-04-30, Chino Hills                                                    |
| Beth Buchanan, LMFT, San Jose       | Psychology Today number | LMFT 37318, renewed & current, expires 2028-10-31, Forestville                                           |
| Agnesa Papazyan, PsyD, Los Angeles  | Name and city           | Psychologist 27872, renewed & current, expires 2027-05-31, Sherman Oaks                                  |
| Angel Esparza, LCSW, Los Angeles    | Name and city           | A name search returns exactly 1 licensee: LCSW 108482, renewed & current, expires 2028-06-30, South Gate |

Notes: the board's detail page for 79279 gives an issuance date of 2017-09-07, while the file's "Original Issue Date" is 2012-08-20, so the two fields measure different things. Record pages live at `/details/<board code>/<type>/<number>/<hash>`, and we can't build the hash ourselves, so the evidence still links to the search page.

## Six-city run (issue 03, GitHub #7), 2026-11-15

Ran the directory collector for all six cities with `--limit 50`, then `evidence.ts --all` and `npm run verify -- --all`.

- **Listings: 50 per city, 300 in total**, every one with a name, `source_url` and phone. A second pass over all six cities inserted nothing.
- **Telehealth groups list one clinician in several cities**, each with a local office. With insurer + name + phone as the identity, each city's run took over the previous city's rows (San Diego fell from 50 to 40). The identity is now insurer + city + name + phone.
- **Results URLs for the five new cities use ZIP-centre latitude and longitude**, not values recorded from the site. Every city returned listings from the right area.
- **About 1 in 3 directory runs timed out in Bright Data on the first try** (results page over 120 s, or `browser_in_use`). A plain rerun worked every time.
- **Evidence: 104 of 300 listings (35%) have evidence**, from 1,732 Bright Data requests (about 6 per listing, as in the San Diego trial). Licence evidence from #22 was being added at the same time.
- **Verifier: the Gemini free tier allows 20 requests per day** for `gemini-3.6-flash`, too few for a full run; it took a paid key. All 312 listings verified: 56 likely real (70+), 2 likely ghost (under 40), the rest Unclear.

## Evidence on the licence number (issue 29, GitHub #65), 2026-11-15

**Why.** 196 of 300 real listings had no evidence. A trial re-run on 3 San Diego listings found nothing (17 Bright Data requests). Many Cigna listings share a telehealth group's placeholder address and toll-free number: 16 San Diego listings share 501 W Broadway Ste 800, and (833) 646-3243 is on 32 listings statewide. The phone-or-city test can never pass on a clinician's own page.

**Change.** `isSamePerson` also accepts a page that shows the listing's name and its board-confirmed licence number as a whole number. `collectEvidence` looks the licence up first so the matcher has the number. Fixed in passing: `profileLicenceNumbers` missed Psychology Today's no-space form ("/ PSY27872"); re-running the licence step then matched 76 listings (was 75).

**Run.** The collector ran on the 46 listings that had a licence record and no web evidence, 4 at a time: 254 Bright Data requests, 6 minutes.

- **10 gained web evidence:** 5 Psychology Today profiles and 5 practice or staff pages. 9 matched on the licence number (for example "Licensed by State of California / 22858", or "LCSW 78811" on a clinic staff page); 1 matched on unique name plus city.
- **Telehealth case:** one Psychology Today profile is in Greensboro, NC, but shows the California licence number the board confirmed, so it is the same clinician practising by telehealth.
- **Failures:** Psychology Today's bot check (3), Bright Data refusing government-classed sites (2), SERP redirects (2) and one proxy timeout. These listings keep their licence row.

The other 36 of the 46 still have only the licence row. Overall, 232 of 300 listings have no web evidence and 196 have no evidence at all.
