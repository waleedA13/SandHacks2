# 29 Evidence: match pages on the board-confirmed licence number (GitHub #65)

**Owner:** Waleed · **Priority:** P1 · **Time box:** 1 h · **Depends on:** #22 (licence evidence, merged in #60)

## Why

After the verifier re-run, 196 of the 300 real listings have no evidence rows, so about 80% of each city shows "Unclear" with "We found no other information". Aditya reported this. A trial re-run of the evidence collector on 3 San Diego listings found nothing (17 Bright Data requests).

The cause is how Cigna lists telehealth groups. Many listings share a placeholder address and a toll-free number. In San Diego, 16 listings share 501 W Broadway Ste 800. Statewide, (833) 646-3243 is on 32 listings. `isSamePerson` accepts a page only if it shows the listing's phone, or for a unique name, the listing's city. A clinician's own page shows neither, so a plain re-run can't find them.

## What to build

1. **Matcher (`src/backend/collector/match.ts`).** `isSamePerson` also accepts a page that shows the listing's name and the licence number the state board confirmed for it, as a whole number (not part of a longer number). This holds even when the name is shared. The name check stays.
2. **Collector (`src/backend/collector/evidence.ts`).** Look the licence up before the web sources and pass its number to the matcher. If that finds nothing, retry with the Psychology Today text, as now.
3. **Re-run** the collector on listings that have a `license_board` row but no other evidence (46 across the six cities, San Diego first). Then send Aditya the listing IDs to re-verify.

**Not in scope:**

- **Matching on a unique name alone:** our listings having one person by that name doesn't make the name unique on the web.
- **Comparing pages with the NPI practice address:** a possible follow-up.
- **Listings with no licence record:** this rule can't help them.

## Files

- Modify: `src/backend/collector/match.ts`, `src/backend/collector/match.test.ts`, `src/backend/collector/evidence.ts`, `src/backend/collector/license.ts` (return the matched number), `docs/smoke-test.md`

## Interfaces

- **Consumes:** `findLicense` from `collector/license.ts` (#22); the existing `isSamePerson` page shape.
- **Produces:** `isSamePerson(listing: { …; licenceNumber?: string | null }, page)`. `findLicense` also returns `number`. New evidence rows use the existing sources; no schema change.

## Acceptance check

- `npm test` passes these new `isSamePerson` cases, written first and seen to fail:
  - same name and the licence number on the page → match
  - shared name and the licence number → match
  - different name with the licence number → no match
  - the number inside a longer number → no match
- Run the collector on the 46 listings. Record in `docs/smoke-test.md` how many gained evidence, from which sources, and how many Bright Data requests it used (budget: about 600 credits).
- Hand-check three new matches: each page names the therapist and shows the licence number.
- Ping Aditya with the listing IDs to re-verify.

## Prompt for your Claude

```
Read CLAUDE.md, docs/issues/29-evidence-licence-number-match.md, docs/issues/18-licence-evidence-collector.md and docs/smoke-test.md ("Licence lookup").
Read src/backend/collector/match.ts, evidence.ts and license.ts as they are now.

Write the isSamePerson tests in the acceptance check first and see the two "match" cases fail. Then add the licence-number rule to isSamePerson: the page must still show the listing's name, and the number must stand alone, not inside a longer number.
In collectEvidence, look the licence up before the web sources, pass its number to the matcher, and fall back to the Psychology Today text only if that first lookup finds nothing. Never accept a page on name alone.
Run npm test, typecheck, lint and format:check. Then run the collector with --listing on each listing that has a license_board row and no other evidence, at most 4 at a time, and report how many gained evidence and the total Bright Data requests.
Do not touch app/, verifier/ or frontend/. Do not commit; show me the diff and a proposed commit message.
```

---

Plan and shared contract: [docs/superpowers/plans/2026-11-14-ghost-network-check.md](https://github.com/waleedA13/TheraCheck/blob/main/docs/superpowers/plans/2026-11-14-ghost-network-check.md) · Issue file: [docs/issues/29-evidence-licence-number-match.md](https://github.com/waleedA13/TheraCheck/blob/main/docs/issues/29-evidence-licence-number-match.md)
