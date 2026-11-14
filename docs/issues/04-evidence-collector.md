# 04 Evidence collector

**Owner:** Waleed · **Priority:** P0 · **Time box:** 2 h · **Depends on:** 02 (can start on fixtures before 03 finishes)

## User stories
- US-F2-M, US-F2-R, US-F2-E, US-F2-D: every reason and source link shown to a user comes from an evidence row.

## What to build
For each listing, find what the rest of the public web says about that therapist and store the page text in `evidence`. Three sources, in this order:

1. **Psychology Today:** search for the therapist's profile; store the profile text (it states insurers accepted and often whether they take new clients).
2. **Practice website:** use the SERP API to find the therapist's own or group practice site; store the text of the page that mentions them.
3. **Zocdoc or Headway:** store the profile text if one exists.

**Matching rule (Review Focus 1):** attach a page to a listing only when the page shows the same normalised name **and** either the same normalised phone or an address in the same city. If two candidates fit, or none clearly does, store nothing for that source. A wrong match is worse than no evidence.

**Shared names.** Every listing in a run is in the same city, so the city test alone cannot tell apart two therapists with the same name. When a listing's normalised name appears more than once in `listings`, accept a page only on a phone match.

## Files
- Create: `collector/evidence.ts`, `collector/match.ts`, `collector/match.test.ts`

## Interfaces
- **Consumes:** `unlock`, `serp` from `collector/brightdata.ts`; `normalizeName`, `normalizePhone` from `collector/normalize.ts`; `sql`; `Listing`, `Evidence`.
- **Produces:** `isSamePerson(listing: { name: string; phone: string | null; city: string; nameIsUnique: boolean }, page: { names: string[]; phones: string[]; text: string }): boolean` in `collector/match.ts`.
- **Produces:** `collectEvidence(listingId: string): Promise<number>` exported from `collector/evidence.ts` (returns rows written; replaces that listing's old evidence). Issue 11's worker calls this.
- **Produces:** command `npx tsx collector/evidence.ts --all` and `--listing <id>`.
- `raw_text` is plain text with HTML stripped, cut to 8,000 characters.

## Acceptance check
- `npm test` passes for `isSamePerson`:
  - same name, same phone → true
  - same name, different phone, city appears in text → true
  - same name, different phone, city absent → false
  - different name, same phone → false
  - listing phone null, name matches, city in text → true
  - `nameIsUnique: false`, same name, different phone, city in text → false
  - `nameIsUnique: false`, same name, same phone → true
  - `nameIsUnique: false`, listing phone null → false
- After `--all`, at least half the listings have one or more evidence rows.
- Spot-check five evidence rows by opening the URL: each is about the right person.
- Bright Data spend for a full run is noted in `docs/smoke-test.md`.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Shared contract" and "Review Focus", docs/smoke-test.md and docs/issues/04-evidence-collector.md.

Write collector/match.test.ts with the isSamePerson cases in the acceptance check, see it fail, then write collector/match.ts.
Write collector/evidence.ts exporting collectEvidence(listingId). For one listing it tries the three sources in the issue, using unlock() and serp() from collector/brightdata.ts only. For each candidate page, extract the names and phone numbers on it, call isSamePerson (set nameIsUnique from a count of that normalised name in listings), and store the stripped text (max 8,000 characters) in evidence only on a match. Delete that listing's previous evidence first.
Run the three sources for a listing in parallel. Process at most 5 listings at once. Log one line per source tried: matched, no match, or failed.
Add a CLI with --all and --listing <id>.
Never invent evidence. If a fetch fails, log it and move on.
Do not touch app/, verifier/ or components/. Do not commit; show me the diff and a proposed commit message.
```
