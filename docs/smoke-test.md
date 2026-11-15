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

## Six-city run (issue 03, GitHub #7), 2026-11-15

Ran the directory collector for all six cities with `--limit 50`, then `evidence.ts --all` and `npm run verify -- --all`.

- **Listings: 50 per city, 300 in total**, every one with a name, `source_url` and phone. A second pass over all six cities inserted nothing.
- **Telehealth groups list one clinician in several cities**, each with a local office. With insurer + name + phone as the identity, each city's run took over the previous city's rows (San Diego fell from 50 to 40). The identity is now insurer + city + name + phone.
- **Results URLs for the five new cities use ZIP-centre latitude and longitude**, not values recorded from the site. Every city returned listings from the right area.
- **About 1 in 3 directory runs timed out in Bright Data on the first try** (results page over 120 s, or `browser_in_use`). A plain rerun worked every time.
- **Evidence: 104 of 300 listings (35%) have evidence**, from 1,732 Bright Data requests (about 6 per listing, as in the San Diego trial). Licence evidence from #22 was being added at the same time.
- **Verifier: the Gemini free tier allows 20 requests per day** for `gemini-3.6-flash`, too few for a full run; it took a paid key. All 312 listings verified: 56 likely real (70+), 2 likely ghost (under 40), the rest Unclear.
