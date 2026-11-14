# 06 Read and write API routes

**Owner:** Aditya · **Priority:** P0 · **Time box:** 1.5 h · **Depends on:** 01 · **Blocks:** 07, 08, 09 · **Do this first**

## User stories
- US-F1 (all four): `GET /api/listings`.
- US-F2 (all four): `GET /api/listings/[id]`.
- US-F3 (all four): `POST /api/calls/result`.
- US-F6 (all four): `GET /api/stats`.

## What to build
The six routes in the plan's "Shared contract". They read and write the database only. None may call Bright Data or Gemini.

- `GET /api/listings?insurer=&city=`: `ListingSummary[]`, highest score first. A listing with no verdict yet appears with score 50, label `Unclear`. Include the latest `done` call if there is one.
- `GET /api/listings/[id]`: `{ listing, verdict, evidence, calls }`. Evidence items return `source`, `url`, `fetchedAt` and the first 300 characters of text. 404 for an unknown id.
- `GET /api/stats?insurer=&city=`: counts by label and `deadEndPct` as a whole number.
- `POST /api/listings/[id]/recheck`: inserts a `queued` job, returns `{ jobId }`. If a `queued` or `running` job already exists for that listing, return its id.
- `GET /api/jobs/[id]`: `{ status }`.
- `POST /api/calls/result`: requires header `x-webhook-secret` equal to `CALLS_WEBHOOK_SECRET`, else 401. Body values other than `yes`, `no`, `unknown` are rejected with 400. Inserts a `done` call and changes nothing else; it never writes to `verdicts`. Returns the listing's final `{ score, label }`.

**Final score.** Every read works out the final score and label as `scoreVerdict(verdict, latestDoneCall)`. `listSummaries` sorts by that final score, `getDetail` returns it, and `getStats` buckets by it (70 and above, 40-69, below 40). The stored `verdicts.score` is the web score only.

Insurer and city matching is case-insensitive.

## Files
- Create: `app/api/listings/route.ts`, `app/api/listings/[id]/route.ts`, `app/api/listings/[id]/recheck/route.ts`, `app/api/jobs/[id]/route.ts`, `app/api/stats/route.ts`, `app/api/calls/result/route.ts`, `lib/queries.ts`, `lib/queries.test.ts`

## Interfaces
- **Consumes:** `sql`, types, `scoreVerdict`.
- **Produces:** the six routes; `lib/queries.ts` with `listSummaries(insurer, city)`, `getDetail(id)`, `getStats(insurer, city)`, `recordCall(input)`, so pages can call the same functions on the server.

## Acceptance check
- Against the fixtures: `curl "localhost:3000/api/listings?insurer=aetna&city=san%20diego"` returns 12 items in descending score.
- `curl localhost:3000/api/stats?insurer=Aetna&city=San%20Diego` returns `total: 12` with the three counts summing to 12.
- `POST /api/calls/result` without the secret returns 401; with `takesPlan: "maybe"` returns 400; with both `no` returns `{ score: 0, label: "Demo call: unavailable" }` and that listing moves to the bottom of `GET /api/listings`.
- Two recheck posts in a row return the same `jobId`.
- `npm test` covers: after a both-`no` call the listing's final score is 0 while `verdicts.score` is unchanged; after the verdict row is rewritten with a new web score, the final score is still 0; and the duplicate-job rule.
- Tell Tracy when `/api/listings` and `/api/listings/[id]` are merged.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Shared contract" and docs/issues/06-api-routes.md.

Write lib/queries.test.ts: after recordCall with both "no", listSummaries gives that listing final score 0 and label "Demo call: unavailable" while verdicts.score is unchanged; rewriting the verdict with a new web score leaves the final score at 0; both "yes" gives 100. Add a test for the rule that a second recheck request returns the existing queued job. See it fail.
Write lib/queries.ts with listSummaries, getDetail, getStats, recordCall and enqueueRecheck using the sql client from lib/db.ts and scoreVerdict from lib/score.ts. Compute the final score and label at read time from the verdict and the latest done call. recordCall only inserts the call; nothing in this file writes to verdicts.
Write the six route handlers as thin wrappers over lib/queries.ts, with the validation and status codes in the issue.
Routes must only touch the database. Do not import anything from collector/ or verifier/.
Run the curl checks in the acceptance list against the seeded database and show me the output.
Do not commit; show me the diff and a proposed commit message.
```
