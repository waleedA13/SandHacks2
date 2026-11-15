# TheraCheck

[![CI](https://github.com/waleedA13/TheraCheck/actions/workflows/ci.yml/badge.svg)](https://github.com/waleedA13/TheraCheck/actions/workflows/ci.yml)
[![Security](https://github.com/waleedA13/TheraCheck/actions/workflows/security.yml/badge.svg)](https://github.com/waleedA13/TheraCheck/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

> Our project for **SanD Hacks Fall 2026**. TheraCheck ranks an insurer's therapist listings by how likely each one is to answer and take new patients, and a voice agent confirms by asking the office.

## Overview

- **Problem:** insurance directories list therapists who have moved, retired, stopped taking the plan or are not taking new patients ("ghost networks"). People seeking care burn their energy calling dead ends.
- **Solution:** pick an insurer and city and get the listings ranked by evidence from the therapist's own web pages, with a one-line reason and sources for each. A voice agent can ask the office the two questions that matter. During the hackathon every call goes to a teammate, never a real office.
- **Tracks:** Bright Data (main), Gemini API, ElevenLabs, Neon.

## Tech stack

| Layer            | What we use                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| App              | Next.js 16 (App Router, TypeScript), React 19, server-rendered pages                            |
| Hosting          | Vercel                                                                                          |
| Database         | Neon Postgres, through `@neondatabase/serverless` (`src/backend/db/client.ts`)                  |
| Scraping         | Bright Data Browser API, Web Unlocker and SERP API (`src/backend/collector/brightdata.ts` only) |
| Reading evidence | Gemini API, Flash tier with structured output (`src/backend/verifier/gemini.ts` only)           |
| Voice            | ElevenLabs Agents (`src/frontend/VoiceWidget.tsx` only)                                         |
| Tests            | Vitest                                                                                          |
| Scripts          | `tsx` runs the TypeScript pipeline scripts by hand                                              |
| Runtime          | Node.js 24, npm                                                                                 |

The four parts (collector, verifier, web app, voice agent) talk only through the database. Pages and API routes read the database; they never call Bright Data or Gemini while a user waits.

## Repository structure

```
.
├── src/
│   ├── app/            # Next.js routing: pages and api/ routes (Next requires them together here)
│   ├── frontend/       # UI components used by the pages
│   ├── backend/        # Server-only code
│   │   ├── db/         # client.ts (sql), schema.sql, seed.sql, reset.ts
│   │   ├── collector/  # Bright Data scrapers and the job worker
│   │   ├── verifier/   # Gemini verifier
│   │   └── queries.ts  # Reads and writes used by pages and API routes
│   └── shared/         # Used by both sides: types.ts, score.ts
├── e2e/                # Playwright end-to-end tests
├── voice/              # Voice agent prompts and setup notes
├── docs/               # Plan, spec, issues and decision records
├── .github/            # Issue/PR templates, CODEOWNERS, CI workflows, Dependabot
└── .env.example        # Every environment variable name (copy to .env.local)
```

## Getting started

```bash
git clone https://github.com/waleedA13/TheraCheck.git
cd TheraCheck
npm install
cp .env.example .env.local   # fill in your keys; never commit .env.local
npm run dev                  # http://localhost:3000
```

## Commands

| Command                 | What it does                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                                                   |
| `npm run format`        | Format every file with Prettier                                                        |
| `npm run format:check`  | Check formatting without changing files                                                |
| `npm run lint`          | Run ESLint                                                                             |
| `npm run typecheck`     | Generate Next.js route types and run `tsc --noEmit`                                    |
| `npm run audit`         | Fail on high or critical `npm audit` advisories                                        |
| `npm run build`         | Production build                                                                       |
| `npm test`              | Same as `test:unit`                                                                    |
| `npm run test:unit`     | Unit tests (`*.test.ts`), no database or network                                       |
| `npm run db:test:up`    | Start Postgres and the Neon HTTP proxy in Docker                                       |
| `npm run db:test:reset` | Apply `src/backend/db/schema.sql` and `src/backend/db/seed.sql` to the Docker database |
| `npm run test:int`      | Reset the Docker database, then run integration tests (`*.int.test.ts`)                |
| `npm run test:e2e`      | Build the app and run Playwright on desktop and phone sizes                            |
| `npm run db:test:down`  | Stop the Docker database and delete its data                                           |
| `npm run db:reset`      | Reset the database in `.env.local`. This drops every table. Never run it in CI         |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. It has four jobs, and each one starts only after the previous one passes:

1. **Static:** `format:check`, `lint`, `typecheck`, `audit`
2. **Unit:** `test:unit`
3. **Integration:** `db:test:up`, then `test:int`
4. **E2E:** `db:test:up`, `db:test:reset`, then `test:e2e`. If it fails, the Playwright report is uploaded as an artifact for 7 days.

CI needs no secrets. Integration and e2e tests read `DATABASE_URL` from the committed `.env.test`, which points at a Postgres container on `db.localtest.me` through the [local Neon HTTP proxy](https://github.com/TimoWilhelm/local-neon-http-proxy). `src/backend/db/neon-local.ts` sends the Neon driver to that proxy only when the host is `db.localtest.me`, so the team Neon database stays out of reach. Tests never call Gemini, Bright Data, ElevenLabs or Twilio.

To run the same checks on your machine, start Docker, then run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run audit
npm run test:unit
npm run db:test:up
npm run test:int
npm run test:e2e
npm run db:test:down
```

These commands work in PowerShell, cmd and bash. The first `test:e2e` run needs `npx playwright install chromium`.

`.github/workflows/security.yml` also runs a Gitleaks secret scan on every push to `main` and every pull request, plus dependency review on pull requests. Vercel deploys every push by itself, so CI has no deploy step.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and pull request workflow. Everyone taking part agrees to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please don't open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report one privately.

## License

Released under the [MIT License](LICENSE).
