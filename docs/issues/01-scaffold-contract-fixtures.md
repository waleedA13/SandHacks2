# 01 Scaffold, database contract and fixtures

**Owner:** Waleed · **Priority:** P0 · **Time box:** 45 min · **Depends on:** none · **Blocks:** everyone

## User stories
Enables all of them. Nobody can start until this is merged.

## What to build
- A Next.js (App Router, TypeScript) app at the repo root, deployable to Vercel.
- A Neon database with the five tables from the plan's "Shared contract".
- `db/seed.sql` with 12 made-up fixture listings for insurer `Aetna`, city `San Diego`, state `CA`. Give them a spread of verdicts: 4 that score 70 or more, 4 between 40 and 69, 4 below 40. Add 2 evidence rows each for at least 6 of them, and one `done` call for one listing. Fill the fit, fee and licence columns for at least 8 of them: a mix of specialties from the plan's fixed list, at least two with `spanish`, some with a fee range and some with none, one `inactive` licence and two `not_found`. Use obviously fake names and `555` phone numbers.
- `lib/db.ts`, `lib/types.ts`, `lib/score.ts` exactly as the contract says.
- `.env.example` with the variable names from the plan; `.env.local` git-ignored.

## Files
- Create: `package.json`, `app/layout.tsx`, `app/page.tsx` (placeholder), `db/schema.sql`, `db/seed.sql`, `lib/db.ts`, `lib/types.ts`, `lib/score.ts`, `lib/score.test.ts`, `.env.example`, `.gitignore`

## Interfaces
- **Produces:** tables `listings`, `evidence`, `verdicts`, `calls`, `jobs`; types `Tri`, `Listing`, `Evidence`, `Verdict`, `Call`, `Job`, `ListingSummary`, `Label`; `scoreVerdict(v, call?)`; `sql` client exported from `lib/db.ts`; scripts `npm run dev`, `npm test`, `npm run db:reset` (applies schema then seed).

## Acceptance check
- `npm test` passes these `scoreVerdict` cases:
  - all `unknown` → score 50, label `Unclear`
  - all `yes` → score 100, label `Likely available`
  - all `no` → score 0, label `Likely dead end`
  - `yes`, `yes`, `unknown` → score 85
  - any web verdict plus call `{ takesPlan: yes, acceptingNew: yes }` → 100, `Confirmed by phone`
  - any web verdict plus call with either `no` → 0, `Confirmed unavailable`
  - call with an `unknown` and no `no` → web score kept
- `npm run db:reset` then `select count(*) from listings` returns 12.
- `npm run dev` serves the placeholder page.
- Teammates can clone, copy `.env.example` to `.env.local`, add `DATABASE_URL`, and run.

## Prompt for your Claude
```
Read CLAUDE.md and docs/superpowers/plans/2026-11-14-ghost-network-check.md, especially "Shared contract".
Implement issue docs/issues/01-scaffold-contract-fixtures.md.

Scaffold a Next.js App Router TypeScript app at the repo root. Add the Neon serverless driver and Vitest.
Write db/schema.sql for the five tables exactly as the contract lists them, with tri columns constrained to yes/no/unknown.
Write db/seed.sql with the 12 fixture listings described in the issue.
Write lib/types.ts, lib/db.ts and lib/score.ts to the contract. Write lib/score.test.ts first with the cases in the acceptance check, see it fail, then implement scoreVerdict.
Add npm scripts dev, test and db:reset. Add .env.example and make sure .env.local is ignored.
Do not add anything the contract does not name. Do not commit; show me the diff and a proposed commit message.
```
