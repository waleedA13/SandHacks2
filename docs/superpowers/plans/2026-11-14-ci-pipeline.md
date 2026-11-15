# CI Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A GitHub Actions pipeline that runs static checks, then unit tests, then integration tests against Postgres in Docker, then Playwright e2e, with the same npm scripts working locally on Windows, macOS and Linux.

**Architecture:** One workflow, four jobs chained with `needs:`. Integration and e2e jobs start `docker-compose.test.yml` (Postgres plus the community Neon HTTP proxy). A small `src/backend/db/neon-local.ts` points the Neon serverless driver at that proxy when the database host is `db.localtest.me`, and does nothing for real Neon hosts.

**Tech Stack:** Next.js 16, TypeScript, Vitest 5 (projects), Playwright, Prettier, ESLint 9, Docker Compose, GitHub Actions, Node 24.

**Spec:** `docs/superpowers/specs/2026-11-14-ci-pipeline-design.md`

## Global Constraints

- Branch `chore/ci-pipeline`, based on `origin/waleed/01-scaffold-contract-fixtures`. Do not rebase onto `main`.
- Node 24 in CI (`actions/setup-node`, `node-version: 24`, `cache: npm`).
- No CI step may call Gemini, Bright Data, ElevenLabs or Twilio, and no CI step may receive a real secret.
- No test or script may connect to a Neon-hosted database. The only database tests use is `postgres://postgres:postgres@db.localtest.me:5432/main`.
- npm scripts must not use inline `VAR=value cmd` syntax (breaks on Windows). Load env from files or config.
- Pin the proxy image by digest, not `:main`. Pin actions to the same major versions `security.yml` uses (`actions/checkout@v7`); for other actions use the latest major (`gh release list -R <owner/repo>`).
- Commits are authored by the repo's git user. No `Co-Authored-By` trailer, no mention of Claude or AI.
- Read `node_modules/next/dist/docs/` before touching anything Next-specific (see `AGENTS.md`): Next 16 differs from older versions.

## Review Focus

1. **Real Neon hit by accident.** `src/backend/db/reset.ts` run with a Neon URL drops every table. Pinned by Task 3 Step 1 (`isLocalNeonHost` false for `*.neon.tech`) and by the test scripts only ever loading `.env.test`.
2. **Windows contributor runs `npm run test:int`.** Must work in PowerShell and cmd. Pinned by Task 3 using `--env-file` and Vitest `env`, never inline env vars.
3. **Docker not running.** `npm run test:int` should fail at `docker compose up` with Docker's own error, not hang. Pinned by `--wait` with a timeout in Task 3.
4. **Gitleaks flags `.env.test`.** The local `postgres:postgres` URL is not a secret. Task 5 Step 2 runs `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo` (or the installed `gitleaks`); if it flags `.env.test`, add a `.gitleaks.toml` that extends the default config and allowlists that one path.
5. **`npm audit` blocks every PR on an advisory with no fix.** Task 1 Step 5 records the current audit result; if a high advisory has no fix, stop and report it rather than lowering the level.

---

### Task 1: Static stage (format, lint, types, audit)

**Files:**

- Modify: `package.json` (devDependencies, scripts), `eslint.config.mjs`
- Create: `.prettierrc.json` (`{}`), `.prettierignore`

**Interfaces:**

- Produces scripts: `format` (`prettier --write .`), `format:check` (`prettier --check .`), `typecheck` (`tsc --noEmit`), `lint` (unchanged), `audit` (`npm audit --audit-level=high`).

- [ ] **Step 1:** `npm i -D prettier eslint-config-prettier`. Add `eslint-config-prettier` (flat config export `eslint-config-prettier/flat`) as the last entry in `eslint.config.mjs`.
- [ ] **Step 2:** `.prettierignore` lists `.next`, `node_modules`, `package-lock.json`, `research_notes`, `reports`, `playwright-report`, `test-results`.
- [ ] **Step 3:** Run `npm run format:check`. Expected: FAIL (scaffold files not yet formatted). This is the red step.
- [ ] **Step 4:** Run `npm run format`, then `npm run format:check`, `npm run lint`, `npm run typecheck`. Expected: all PASS. Commit the formatting churn on its own: `style: format repository with Prettier`.
- [ ] **Step 5:** Run `npm run audit`. Expected: exit 0. If a high or critical advisory has no fix, stop and report the package and advisory ID.
- [ ] **Step 6:** Commit `chore: add Prettier, typecheck and audit scripts`.

### Task 2: Unit stage (Vitest projects)

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json` scripts

**Interfaces:**

- Produces Vitest projects `unit` (include `**/*.test.ts`, exclude `**/*.int.test.ts`, `e2e/**`, `node_modules/**`) and `int` (include `**/*.int.test.ts`, `test.env` loaded from `.env.test`, `fileParallelism: false`).
- Produces scripts: `test` → `vitest run --project unit`, `test:unit` (same), `test:int` (Task 3).

- [ ] **Step 1:** Write `vitest.config.ts` with the two projects; resolve the `@/*` path alias to the repo root.
- [ ] **Step 2:** Run `npm run test:unit`. Expected: PASS, `src/shared/score.test.ts` runs, no `*.int.test.ts` picked up.
- [ ] **Step 3:** Commit `test: split Vitest into unit and integration projects`.

### Task 3: Integration stage (Postgres in Docker)

**Files:**

- Create: `docker-compose.test.yml`, `.env.test`, `src/backend/db/neon-local.ts`, `src/backend/db/neon-local.test.ts`, `src/backend/db/seed.int.test.ts`
- Modify: `src/backend/db/client.ts`, `src/backend/db/reset.ts`, `.gitignore` (add `!.env.test`), `package.json` scripts

**Interfaces:**

- Produces `isLocalNeonHost(url: string): boolean` (true only when hostname is `db.localtest.me`) and `configureNeonForUrl(url: string): void` in `src/backend/db/neon-local.ts`. For local hosts it sets on `neonConfig`: `fetchEndpoint` → `http://db.localtest.me:4444/sql`, `wsProxy` → `(host) => \`${host}:4444/v1\``, `useSecureWebSocket`→`false`, `pipelineTLS`→`false`, `pipelineConnect`→`false`. For any other host it changes nothing.
- `src/backend/db/client.ts` and `src/backend/db/reset.ts` call `configureNeonForUrl(url)` before creating `neon()` / `Pool`.
- Produces scripts: `db:test:up` (`docker compose -f docker-compose.test.yml up -d --wait --wait-timeout 60`), `db:test:down` (`docker compose -f docker-compose.test.yml down -v`), `db:test:reset` (`tsx --env-file=.env.test src/backend/db/reset.ts`), `test:int` (`npm run db:test:reset && vitest run --project int`).
- `.env.test` contains exactly `DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/main`.

- [ ] **Step 1: Write the failing unit test** `src/backend/db/neon-local.test.ts`:
  - `isLocalNeonHost("postgres://postgres:postgres@db.localtest.me:5432/main")` is `true`
  - `isLocalNeonHost("postgresql://u:p@ep-cool-123.us-east-2.aws.neon.tech/neondb")` is `false`
  - after `configureNeonForUrl(local)`, `neonConfig.useSecureWebSocket` is `false` and `fetchEndpoint` resolves to `http://db.localtest.me:4444/sql`
  - after resetting `neonConfig` and calling `configureNeonForUrl(neonUrl)`, `neonConfig.useSecureWebSocket` is still its default `true`
- [ ] **Step 2:** `npm run test:unit`. Expected: FAIL, module `./neon-local` not found.
- [ ] **Step 3:** Implement `src/backend/db/neon-local.ts`; wire it into `src/backend/db/client.ts` and `src/backend/db/reset.ts`.
- [ ] **Step 4:** `npm run test:unit`. Expected: PASS.
- [ ] **Step 5:** `docker-compose.test.yml`: service `postgres` (`postgres:17`, user/password `postgres`, db `main`, port `5432:5432`, `pg_isready` healthcheck, no volume) and `neon-proxy` (`ghcr.io/timowilhelm/local-neon-http-proxy@sha256:<digest>`, `PG_CONNECTION_STRING=postgres://postgres:postgres@postgres:5432/main`, port `4444:4444`, `depends_on` postgres healthy). Get the digest with `docker pull` then `docker inspect --format '{{index .RepoDigests 0}}'`.
- [ ] **Step 6: Write the failing integration test** `src/backend/db/seed.int.test.ts`: imports `sql` from `@/lib/db`; asserts `select count(*)::int as n from listings` returns `n` equal to the number of listings rows inserted by `src/backend/db/seed.sql` (count them and hard-code the number). Run `npm run test:int` with Docker stopped: expected FAIL at `db:test:reset` with a connection error. Then `npm run db:test:up` and `npm run test:int`: expected PASS.
- [ ] **Step 7:** Commit `test: run integration tests against Postgres in Docker`.

### Task 4: E2E stage (Playwright)

**Files:**

- Create: `playwright.config.ts`, `e2e/home.spec.ts`
- Modify: `package.json`, `.gitignore` (`playwright-report/`, `test-results/`, `blob-report/`), `vitest.config.ts` only if `e2e/**` leaks into a project

**Interfaces:**

- Consumes `.env.test` and `npm run db:test:up` / `db:test:reset` from Task 3.
- Produces script `test:e2e` (`playwright test`). `playwright.config.ts` loads `.env.test` with `process.loadEnvFile`, sets `webServer` to `npm run build && npm run start` on port 3000 (`reuseExistingServer: !process.env.CI`, timeout 180 s), `retries: process.env.CI ? 1 : 0`, `reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list"`, projects `desktop-chromium` (`devices["Desktop Chrome"]`) and `mobile-chromium` (`devices["Pixel 7"]`).

- [ ] **Step 1:** `npm i -D @playwright/test`, `npx playwright install chromium`.
- [ ] **Step 2: Write the test** `e2e/home.spec.ts`: on `/`, the page has a level-1 heading named `TheraCheck`, `<html>` has a `lang` attribute, and no `console` errors are logged during load.
- [ ] **Step 3:** Run `npm run test:e2e`. Expected: if the layout already sets `lang`, PASS on both projects; if it fails on `lang`, fix `src/app/layout.tsx` and re-run to PASS.
- [ ] **Step 4:** Commit `test: add Playwright e2e on desktop and phone sizes`.

### Task 5: Workflow and docs

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (Continuous integration section, commands table), `CONTRIBUTING.md` (run `npm run format` and the four test scripts before pushing), `CHANGELOG.md` (Unreleased → Added)

**Interfaces:**

- Jobs, in order: `static` → `unit` (`needs: static`) → `integration` (`needs: unit`) → `e2e` (`needs: integration`). Triggers: `pull_request` and `push` to `main`. `permissions: contents: read`. `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`. Each job: checkout, setup-node 24 with npm cache, `npm ci`.
- `static`: `format:check`, `lint`, `typecheck`, `audit`.
- `unit`: `test:unit`.
- `integration`: `db:test:up`, `test:int`.
- `e2e`: `db:test:up`, `db:test:reset`, `npx playwright install --with-deps chromium`, `test:e2e`; on failure upload `playwright-report/` with `actions/upload-artifact`, retention 7 days.

- [ ] **Step 1:** Write `ci.yml`. Validate syntax with `npx --yes @action-validator/cli .github/workflows/ci.yml` or `actionlint` if available.
- [ ] **Step 2:** Run the full sequence locally: `npm run format:check && npm run lint && npm run typecheck && npm run audit && npm run test:unit && npm run db:test:up && npm run test:int && npm run db:test:reset && npm run test:e2e`. Expected: all PASS. Run the gitleaks check from Review Focus 4. Then `npm run db:test:down`.
- [ ] **Step 3:** Update README, CONTRIBUTING, CHANGELOG. Remove the README note that says to set a dummy `DATABASE_URL` in CI; replace with the `.env.test` approach.
- [ ] **Step 4:** Commit `ci: add staged CI workflow`.
