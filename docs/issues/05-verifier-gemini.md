# 05 Verifier with Gemini

**Owner:** Aditya · **Priority:** P0 · **Time box:** 2 h · **Depends on:** 01 (works on fixture evidence) · **Do this after 06 and 07**, which unblock Tracy

## User stories

- US-F1-M, US-F1-R, US-F1-E, US-F1-D: the score that orders the list.
- US-F2-M, US-F2-R, US-F2-E: the one-line reason, in plain words.

## What to build

A script that reads a listing's evidence, asks Gemini for three facts, scores them with `scoreVerdict`, and writes one `verdicts` row.

The three facts, each `yes`, `no` or `unknown`:

- `stillPractising`: does the evidence show this person currently practising at this location?
- `listsInsurer`: does any source say they accept this insurer?
- `acceptingNew`: does any source say they are taking new clients?

Rules:

- Gemini must answer `unknown` when the evidence does not say. Silence is not a `no`.
- The reason is one sentence, at most 140 characters, at a plain reading level, and names the source. Example: "Their own website says they are not taking new clients."
- **Web score only.** The verifier writes the score from web evidence and never reads or writes call results. Calls are applied when data is read (see "Where scores live" in the plan), so a re-check cannot erase one.
- **No evidence (Review Focus 2):** do not call Gemini. Write all `unknown`, score 50, reason "We found no other information about this listing."

## Files

- Create: `verifier/gemini.ts`, `verifier/verify.ts`, `verifier/verify.test.ts`

## Interfaces

- **Consumes:** `sql`; `scoreVerdict` from `lib/score.ts`; `Evidence`, `Verdict`, `Tri`.
- **Produces:** `extractFacts(input: { name: string; insurer: string; evidence: { source: string; text: string }[] }): Promise<{ stillPractising: Tri; listsInsurer: Tri; acceptingNew: Tri; reason: string }>` in `verifier/gemini.ts`, the only file that calls Gemini.
- **Produces:** `verifyListing(listingId: string): Promise<Verdict>` exported from `verifier/verify.ts`. Issue 11's worker calls this.
- **Produces:** command `npx tsx verifier/verify.ts --all` and `--listing <id>`.

## Acceptance check

- `npm test` passes with `extractFacts` mocked:
  - a listing with zero evidence rows gets all `unknown`, score 50, the fixed reason, and `extractFacts` is not called
  - facts `yes`, `no`, `unknown` produce the score `scoreVerdict` returns for them
  - a reason longer than 140 characters is cut to 140
- Run `--all` on the fixtures: every listing has a verdict; reasons read naturally.
- Hand-check three real listings after issue 04 lands: the facts agree with what the source pages say.

## Prompt for your Claude

```
Read CLAUDE.md, the plan's "Shared contract" and "Review Focus", and docs/issues/05-verifier-gemini.md.
Check the current Gemini API docs for the Flash-tier model name and for structured (JSON schema) output before writing verifier/gemini.ts.

Write verifier/verify.test.ts with the cases in the acceptance check, mocking extractFacts, and see it fail.
Write verifier/gemini.ts with extractFacts: one request, structured output constrained to the three tri-state fields plus reason, temperature 0. The instruction must say to answer "unknown" unless the evidence states it, and to write the reason in one plain sentence that names the source.
Write verifier/verify.ts with verifyListing: load the listing and its evidence, short-circuit when there is none, otherwise call extractFacts, score with scoreVerdict from lib/score.ts, and upsert the verdicts row with checked_at = now.
Add a CLI with --all (at most 5 at once) and --listing <id>.
Do not change lib/score.ts or anything under collector/, app/ or components/. Do not commit; show me the diff and a proposed commit message.
```
