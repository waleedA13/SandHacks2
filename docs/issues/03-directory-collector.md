# 03 Directory collector

**Owner:** Waleed · **Priority:** P0 · **Time box:** 2 h · **Depends on:** 02

## User stories
- US-F1-M, US-F1-R, US-F1-E, US-F1-D: the ranked list needs real listings.
- US-F6-M, US-F6-R, US-F6-E, US-F6-D: the accuracy number is counted over these listings.

## What to build
A script that scrapes the insurer directory chosen in issue 02 for therapists in San Diego and writes 30-50 rows to `listings`. Run it by hand; it is never called by the web app.

- Capture name, credential, office address, office phone, and the URL the listing came from.
- Look up each person in the NPI Registry API by name, city and state. Store the NPI only when exactly one result matches; otherwise leave it null.
- Running it twice must not create duplicates: treat insurer + name + phone as the identity.

## Files
- Create: `collector/directory.ts`, `collector/npi.ts`, `collector/normalize.ts`, `collector/normalize.test.ts`

## Interfaces
- **Consumes:** `openBrowser()` from `collector/brightdata.ts`; `sql` from `lib/db.ts`; `Listing` from `lib/types.ts`.
- **Produces:** rows in `listings`. Command: `npx tsx collector/directory.ts --insurer "<name>" --zip 92101 --limit 50`.
- **Produces:** `normalizePhone(raw: string): string | null` (digits only, 10 digits, else null) and `normalizeName(raw: string): string` (lower-case, credentials and punctuation stripped) in `collector/normalize.ts`. Issue 04 uses both.

## Acceptance check
- `npm test` passes: `normalizePhone("(619) 555-0142")` is `"6195550142"`; `normalizePhone("ext 4")` is `null`; `normalizeName("Dr. Ana Ruiz, LMFT")` equals `normalizeName("ana ruiz")`.
- After one run, `select count(*) from listings where insurer = '<name>'` is between 30 and 50.
- After a second run the count is unchanged.
- Every row has a name and a `source_url`; at least 80% have a phone.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Shared contract", docs/smoke-test.md and docs/issues/03-directory-collector.md.

Write collector/normalize.test.ts with the cases in the acceptance check, see it fail, then write collector/normalize.ts.
Write collector/npi.ts with one function that queries the public NPI Registry API (https://npiregistry.cms.hhs.gov/api/, version 2.1) by first name, last name, city and state, and returns the NPI only when exactly one result comes back.
Write collector/directory.ts: use openBrowser() from collector/brightdata.ts and the search steps recorded in docs/smoke-test.md to page through results, extract the fields in the issue, normalise, look up the NPI, and upsert into listings keyed on insurer + normalised name + normalised phone.
Only call Bright Data through collector/brightdata.ts. Log one line per listing saved.
Do not touch app/, verifier/ or components/. Do not commit; show me the diff and a proposed commit message.
```
