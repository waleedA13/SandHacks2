# 16 Fit, fee and licence facts in the verifier and API

**Owner:** Aditya · **Priority:** P1 · **Time box:** 1 h · **Depends on:** 05, 06

Start only after the Sat 9 PM checkpoint shows the core working.

## User stories
- US-F7-M, US-F7-R, US-F7-E, US-F7-D: the data behind the fit filters.
- US-F8-M, US-F8-R, US-F8-E, US-F8-D: the posted self-pay fee.
- US-F9-M, US-F9-R, US-F9-E, US-F9-D: the licence status, read from the evidence that issue 18 collects.

## What to build
Extend the existing Gemini extraction to return more facts from the same evidence, in the same single request, and let the listings route filter on them.

New facts:
- `specialties`: zero or more values from the plan's fixed list only. Anything else is dropped.
- `languages`: lower-case English names of languages other than English that the therapist offers sessions in.
- `telehealth`: `yes`, `no` or `unknown`.
- `selfPayMin`, `selfPayMax`: whole dollars per session, only when a page states a session fee. One stated price sets both. Sliding scale "from $80 to $160" sets 80 and 160. No stated fee leaves both null. Never estimate.
- `licenseStatus`: `active`, `inactive` or `not_found`, read only from an evidence row whose source is `license_board`. With no such row it stays `unchecked`.
- `licenseDiscipline`: `yes`, `no` or `unknown`, from the same row only.

Rules:
- Each fact is filled only when the evidence states it. Silence gives an empty list, null or `unknown`.
- These facts do not change the score.
- The no-evidence short-circuit from issue 05 stays: empty lists, nulls, `unknown`, `unchecked`.

API: `GET /api/listings` accepts optional `specialty`, `language` and `telehealth=yes`. Filters combine with AND. A listing with unknown telehealth is excluded when `telehealth=yes`. `ListingSummary` and the detail response carry the new fields.

## Files
- Modify: `verifier/gemini.ts`, `verifier/verify.ts`, `verifier/verify.test.ts`, `lib/queries.ts`, `lib/queries.test.ts`, `app/api/listings/route.ts`, `lib/types.ts` (new fields are already named in the contract)

## Interfaces
- **Consumes:** evidence rows, including source `license_board` from issue 18 when present.
- **Produces:** the new `verdicts` columns filled in; `listSummaries(insurer, city, filters?: { specialty?: string; language?: string; telehealth?: boolean })`.

## Acceptance check
- `npm test` passes with `extractFacts` mocked:
  - a specialty outside the fixed list is dropped before saving
  - `selfPayMin` greater than `selfPayMax` is swapped
  - no `license_board` evidence gives `licenseStatus` `unchecked`, whatever Gemini returns
  - `listSummaries` with `specialty: "anxiety"` and `language: "spanish"` returns only listings having both
- On the fixtures: `curl ".../api/listings?insurer=aetna&city=san%20diego&language=spanish"` returns only the Spanish-speaking fixtures.
- Hand-check five real listings: every fee shown appears word for word on a linked source page.
- Tell Tracy the fields are live.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Shared contract" and "Fixed vocabularies", and docs/issues/16-fit-fee-licence-facts.md. Read verifier/gemini.ts and verifier/verify.ts as they are now.

Add the test cases in the acceptance check to verifier/verify.test.ts and lib/queries.test.ts and see them fail.
Extend the structured output in verifier/gemini.ts with the six new facts, in the same single request. The instruction must say: fill a fact only when the evidence states it; take licence facts only from the evidence marked license_board; never estimate a fee.
In verifier/verify.ts, clean the result before saving: keep only specialties in the fixed list, lower-case languages, swap min and max if reversed, and force licenseStatus to "unchecked" when the listing has no license_board evidence. Do not change the score.
In lib/queries.ts add the optional filters to listSummaries and the new fields to both responses. Read the three query parameters in app/api/listings/route.ts.
Do not touch collector/ or components/. Do not commit; show me the diff and a proposed commit message.
```
