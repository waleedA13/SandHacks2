# 03 Directory collector

**Owner:** Waleed · **Priority:** P0 · **Time box:** 2 h · **Depends on:** 02

## User stories

- US-F1-M, US-F1-R, US-F1-E, US-F1-D: the ranked list needs real listings.
- US-F6-M, US-F6-R, US-F6-E, US-F6-D: the accuracy number is counted over these listings.

## What to build

A script that scrapes the insurer directory chosen in issue 02 for therapists near one ZIP code and writes about 30 rows to `listings`. Run it by hand, once per city; it is never called by the web app.

Scope is California. Run San Diego first and get it working end to end before the others:

| City          | ZIP   |
| ------------- | ----- |
| San Diego     | 92101 |
| Los Angeles   | 90012 |
| San Francisco | 94102 |
| San Jose      | 95113 |
| Sacramento    | 95814 |
| Fresno        | 93721 |

Store the city name from the table above, not whatever the directory prints, so searches match.

- Capture name, credential, office address, office phone, and the URL the listing came from.
- Look up each person in the NPI Registry API by name, city and state. Store the NPI only when exactly one result matches; otherwise leave it null.
- Running it twice must not create duplicates: treat insurer + city + name + phone as the identity. (City was added during the six-city run: telehealth groups list the same clinician at an office in several cities, and without it each city's run took over the previous city's rows.)

## Files

- Create: `src/backend/collector/directory.ts`, `src/backend/collector/npi.ts`, `src/backend/collector/normalize.ts`, `src/backend/collector/normalize.test.ts`

## Interfaces

- **Consumes:** `openBrowser()` from `src/backend/collector/brightdata.ts`; `sql` from `src/backend/db/client.ts`; `Listing` from `src/shared/types.ts`.
- **Produces:** rows in `listings`. Command: `npx tsx src/backend/collector/directory.ts --insurer "<name>" --zip 92101 --limit 50`.
- **Produces:** `normalizePhone(raw: string): string | null` (digits only, 10 digits, else null) and `normalizeName(raw: string): string` (lower-case, credentials and punctuation stripped) in `src/backend/collector/normalize.ts`. Issue 04 uses both.

## Acceptance check

- `npm test` passes: `normalizePhone("(619) 555-0142")` is `"6195550142"`; `normalizePhone("ext 4")` is `null`; `normalizeName("Dr. Ana Ruiz, LMFT")` equals `normalizeName("ana ruiz")`.
- After one run for San Diego, `select count(*) from listings where city = 'San Diego'` is between 25 and 50.
- After all six runs, every city has at least 20 listings, or `docs/smoke-test.md` says which city fell short and why.
- After a second run the count is unchanged.
- Every row has a name and a `source_url`; at least 80% have a phone.

## Prompt for your Claude

```
Read CLAUDE.md, the plan's "Shared contract", docs/smoke-test.md and docs/issues/03-directory-collector.md.

Write src/backend/collector/normalize.test.ts with the cases in the acceptance check, see it fail, then write src/backend/collector/normalize.ts.
Write src/backend/collector/npi.ts with one function that queries the public NPI Registry API (https://npiregistry.cms.hhs.gov/api/, version 2.1) by first name, last name, city and state, and returns the NPI only when exactly one result comes back.
Write src/backend/collector/directory.ts: use openBrowser() from src/backend/collector/brightdata.ts and the search steps recorded in docs/smoke-test.md to page through results, extract the fields in the issue, normalise, look up the NPI, and upsert into listings keyed on insurer + normalised name + normalised phone.
Only call Bright Data through src/backend/collector/brightdata.ts. Log one line per listing saved.
Do not touch src/app/, src/backend/verifier/ or src/frontend/. Do not commit; show me the diff and a proposed commit message.
```
