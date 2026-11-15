# CI pipeline design

- **Date:** 2026-11-14
- **Owner:** Aditya
- **Status:** Approved

## Why

Four people push to one repo during a 24-hour hackathon. CI has to catch broken formatting, lint and type errors, vulnerable dependencies, and broken behaviour before a PR merges, without spending vendor credits or touching the shared Neon database.

## Goals

- Stages run in order, and a stage starts only when the one before it passes:
  1. **Static:** Prettier check, ESLint, `tsc --noEmit`, `npm audit --audit-level=high`
  2. **Unit:** Vitest on `*.test.ts`, no database, no network
  3. **Integration:** Vitest on `*.int.test.ts`, API route handlers and SQL against a real Postgres
  4. **E2E:** Playwright (Chromium, desktop and phone sizes) against `next build && next start`
- The same commands run locally and in CI.
- Every PR runs every stage, Dependabot PRs included.

## Non-goals

- No deploy step. Vercel deploys every push by itself.
- No coverage thresholds, no cross-browser matrix.

## Anti-goals

- CI calls Gemini, Bright Data, ElevenLabs or Twilio. That would spend credits, could ring real phones, and would need every key stored as a CI secret.
- CI connects to the team's Neon project. `db:reset` drops every table.

## Approaches considered

1. **Postgres in Docker behind the community Neon HTTP proxy** (chosen). `docker-compose.test.yml` runs `postgres` and `ghcr.io/timowilhelm/local-neon-http-proxy` (pinned by digest). Neon's serverless-driver docs point to this setup for local work. No secrets, so every PR runs everything. Cost: `lib/db.ts` sets `neonConfig` endpoints when the host is `db.localtest.me`.
2. **A throwaway Neon branch per CI run.** Same driver as production and a Neon-track talking point, but it needs `NEON_API_KEY` and `NEON_PROJECT_ID` as secrets, and Dependabot PRs cannot read secrets, so they would skip stages 3 and 4.
3. **Plain Postgres container without the proxy.** Neon's serverless driver cannot talk to plain Postgres, so tests would need a second driver. Rejected.

## Decisions

- CI lands as a PR into Waleed's scaffold branch (`waleed/01-scaffold-contract-fixtures`, PR #25), so the scaffold itself merges to `main` with CI already gating it, and the two PRs never conflict over `package.json`.
- Vendor modules (`collector/brightdata.ts`, `verifier/gemini.ts`, `components/VoiceWidget.tsx`) are mocked in unit and integration tests. A separate `npm run test:live` suite (real vendors, run by hand, never in CI) is out of scope for this change and comes with the first vendor issue.
- Node 24 in CI, matching the README.
- Test-first: each stage gets one starter test that is committed failing and then made to pass.

## Left to the builder

- Exact Prettier options (default config plus `eslint-config-prettier`).
- Job names and caching details in `ci.yml`.
