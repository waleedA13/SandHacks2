# 02 Bright Data smoke test and insurer choice

**Owner:** Waleed · **Priority:** P0 · **Time box:** 75 min, hard stop Sat 4:00 PM · **Depends on:** 01

## User stories

US-F1-M, US-F1-R, US-F1-E, US-F1-D depend on a directory we can actually read.

## What to build

A throwaway script that proves each Bright Data product works against our real targets, and a decision on which insurer the demo uses. Nothing was tested through Bright Data during research, so this is the riskiest hour of the project.

Test in this order and record results in `docs/smoke-test.md`:

1. **Browser API on an insurer directory.** Run a guest search for therapists or behavioural health near San Diego 92101 and reach a results page. Try Aetna first, then Cigna, Blue Shield of California, Anthem. Stop at the first one that returns at least 20 listings with name and phone.
2. **Web Unlocker** on one Psychology Today profile page, one Zocdoc therapist page and one Headway page.
3. **SERP API** for a query like `"<therapist name>" therapist San Diego`.

For each, record: worked or not, seconds taken, and what came back.

## Fallback if no insurer directory works by 4:00 PM

Tell the team. Then open the chosen directory in a normal browser, copy 30 listings by hand into `src/backend/db/demo-listings.csv`, and load those. Bright Data still does all the evidence scraping in issue 04. Say plainly in the pitch that the directory list was entered by hand.

## Files

- Create: `src/backend/collector/brightdata.ts`, `src/backend/collector/smoke.ts`, `docs/smoke-test.md`

## Interfaces

- **Produces:** `src/backend/collector/brightdata.ts` exporting `unlock(url: string): Promise<string>` (page HTML), `serp(query: string): Promise<{ title: string; url: string }[]>`, `openBrowser(): Promise<Browser>` (Playwright browser connected to Bright Data). This is the only file that knows Bright Data's endpoints and zones.
- **Produces:** the chosen insurer name, written at the top of `docs/smoke-test.md`.

## Acceptance check

- `npx tsx src/backend/collector/smoke.ts` prints a pass or fail line for each of the three products.
- `docs/smoke-test.md` names the insurer, the working search steps, and the measured seconds per request.
- The team has been told the result.

## Prompt for your Claude

```
Read CLAUDE.md, the plan, and docs/issues/02-brightdata-smoke-test.md.
Look up the current Bright Data docs for Browser API (connecting Playwright over CDP), Web Unlocker (API request format) and SERP API before writing anything; do not rely on memory for endpoints or parameters.

Create src/backend/collector/brightdata.ts with unlock, serp and openBrowser, reading credentials from the env names in .env.example.
Create src/backend/collector/smoke.ts that tries each product against the targets in the issue and prints pass/fail and seconds.
For the insurer directory, drive the guest search step by step and save a screenshot at each step so I can see where it gets stuck. Try the insurers in the order given and stop at the first that works.
Write the results to docs/smoke-test.md.
This is a spike: no tests, keep it short. Tell me plainly if a site cannot be read rather than working around it with fake data.
```
