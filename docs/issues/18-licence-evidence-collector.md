# 18 Licence evidence collector

**Owner:** Waleed · **Priority:** P1 · **Time box:** 1.5 h, abandon if no record is fetched within 45 min · **Depends on:** 02, 04

Start only after the Sat 9 PM checkpoint shows the core working. This is the riskiest of the added features: the board's search rejected scripted requests during research, and a wrong match would say something false about a real person.

## User stories

- US-F9-M, US-F9-R, US-F9-E, US-F9-D: a licence status backed by the board's own record.

## What to build

For each listing, look the therapist up on the California Department of Consumer Affairs licence search (`https://search.dca.ca.gov/`) and store the record page's text as an evidence row with source `license_board`. Issue 16 reads status and discipline from that text.

- Use the Bright Data Browser API through `src/backend/collector/brightdata.ts`. Check first whether the board publishes a bulk download or API for these licence types; if it does, use that and do not scrape.
- Search by first and last name, limited to the licence type that matches the listing's credential (for example LMFT, LCSW, LPCC, psychologist).

**Matching rule.** Store a record only when all of these hold:

- the search returns exactly one licensee with that normalised name and licence type, and
- the record's city or county matches the listing's city.

If there are zero results, several results, or the place does not match, store nothing. The app then says "We could not match a licence record", which is the correct outcome. Never pick the "closest" result.

## Files

- Create: `src/backend/collector/license.ts`, `src/backend/collector/license.test.ts`
- Modify: `src/backend/collector/evidence.ts` (call it as a fourth source)

## Interfaces

- **Consumes:** `openBrowser()` from `src/backend/collector/brightdata.ts`; `normalizeName` from `src/backend/collector/normalize.ts`.
- **Produces:** `pickLicenseRecord(listing: { name: string; credential: string | null; city: string }, results: { name: string; type: string; city: string; url: string }[]): { url: string } | null` in `src/backend/collector/license.ts`.
- **Produces:** evidence rows with source `license_board`, `url` pointing at the board's record page, `raw_text` holding the record text including status and any disciplinary action.

## Acceptance check

- `npm test` passes for `pickLicenseRecord`:
  - one result, same name, same type, same city → that record
  - two results with the same name and type → null
  - one result, same name, different city → null
  - one result, same name, different licence type → null
  - listing credential null → null
  - no results → null
- Run it for the San Diego listings. Record in `docs/smoke-test.md` how many matched, how many returned nothing, and seconds per lookup.
- Open five stored record URLs by hand: each is the right person.
- If the search cannot be automated within 45 minutes, stop, note it in `docs/smoke-test.md`, and tell the team. The pages already handle `unchecked`.

## Prompt for your Claude

```
Read CLAUDE.md, the plan's "Shared contract", docs/smoke-test.md and docs/issues/18-licence-evidence-collector.md.
First check whether the California Department of Consumer Affairs offers a public data download or API for licence lookups. If it does, tell me and use that instead of scraping.

Write src/backend/collector/license.test.ts with the pickLicenseRecord cases in the acceptance check, see it fail, then write pickLicenseRecord in src/backend/collector/license.ts.
Then write the lookup: use openBrowser() from src/backend/collector/brightdata.ts to run a name search on search.dca.ca.gov limited to the licence type mapped from the listing's credential, collect the result rows, call pickLicenseRecord, and if it returns a record, open it and return its plain text and URL. Save a screenshot at each step while developing so I can see where it gets stuck.
Add it as a fourth source in collectEvidence in src/backend/collector/evidence.ts, writing an evidence row with source "license_board".
The matching rule is a safety control: never store a record that pickLicenseRecord rejected, and never choose the closest match.
Do not touch src/app/, src/backend/verifier/ or src/frontend/. Do not commit; show me the diff and a proposed commit message.
```
