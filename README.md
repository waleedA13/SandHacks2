# TheraCheck

[![CI](https://github.com/waleedA13/TheraCheck/actions/workflows/ci.yml/badge.svg)](https://github.com/waleedA13/TheraCheck/actions/workflows/ci.yml)
[![Security](https://github.com/waleedA13/TheraCheck/actions/workflows/security.yml/badge.svg)](https://github.com/waleedA13/TheraCheck/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

> Built at **SanD Hacks Fall 2026** by Waleed A, Aditya Jadhav and Tracy (Qinggin).

**Live demo:** <https://theracheck.vercel.app>

## What it does

TheraCheck takes an insurer and a California city and re-orders that insurer's therapist directory. Listings with evidence that the therapist answers the phone and takes new patients go to the top. Each listing shows a one-line reason and links to the pages behind it.

## Why

Insurer directories list therapists who moved, retired, left the plan or closed their practice to new patients. A [2023 study of California regulator data](https://www.ajmc.com/view/provider-directory-inaccuracy-and-timely-access-for-mental-health-care) found about 1 in 3 mental health listings wrong in 2018. You call down the list and reach dead numbers.

## Try the demo

1. Open the [live demo](https://theracheck.vercel.app) and search Cigna in San Diego.
2. Open the first result. Read the reason, then follow the evidence and licence links.
3. Press "Ask the assistant" on a listing. The voice agent phones a teammate, asks whether the office takes the plan and takes new patients, and saves the answers.

## How it works

- **Bright Data** scrapes Cigna's directory, then finds and reads each therapist's own pages with the Browser API, Web Unlocker and SERP API.
- **Gemini** reads those pages and returns facts: still practising here, lists the insurer, takes new patients, specialties, languages and posted fee.
- **A score** built from those facts ranks the listings as Likely available, Unclear or Likely dead end.
- **ElevenLabs** runs the voice agent.
- **Neon** stores the listings, evidence, verdicts and call results.

## What is real and what is staged

- **Real:** the Cigna listings, the evidence pages, the verdicts, and licence records from California DCA files.
- **Staged:** the phone calls. The agent dials teammates' phones from an allow-list and no real office. The page labels those results as demo calls.
- **Limits:** web pages suggest and the office confirms. At submission, 45 of 50 San Diego listings read Unclear, because many therapists publish nothing about insurance or openings. We have not validated the ranking against real offices.

## Tracks

Bright Data "Data for Good" (main), ElevenLabs, Gemini API, Neon.

## Tech stack

| Layer            | What we use                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App              | Next.js 16 (App Router, TypeScript), React 19, server-rendered pages                                                                                                                             |
| Hosting          | Vercel                                                                                                                                                                                           |
| Database         | Neon Postgres, through `@neondatabase/serverless` (`src/backend/db/client.ts`)                                                                                                                   |
| Scraping         | Bright Data Browser API, Web Unlocker and SERP API (`src/backend/collector/brightdata.ts` only)                                                                                                  |
| Licence data     | California DCA monthly licensee files, downloaded by hand into `data/` (gitignored), matched by licence number from the NPI Registry API or by name and city; `src/backend/collector/license.ts` |
| Reading evidence | Gemini API, Flash tier with structured output (`src/backend/verifier/gemini.ts` only)                                                                                                            |
| Voice            | ElevenLabs Agents (`src/frontend/VoiceWidget.tsx` only)                                                                                                                                          |
| Tests            | Vitest and Playwright                                                                                                                                                                            |
| Scripts          | `tsx` runs the TypeScript pipeline scripts by hand                                                                                                                                               |
| Runtime          | Node.js 24, npm                                                                                                                                                                                  |

The four parts (collector, verifier, web app, voice agent) talk only through the database. Pages and API routes read the database; they never call Bright Data or Gemini while a user waits.

## Repository structure

```
.
├── src/
│   ├── app/            # Next.js routing: pages and api/ routes (Next requires them together here)
│   ├── frontend/       # UI components used by the pages
│   ├── backend/        # Server-only code
│   │   ├── db/         # client.ts (sql), schema.sql, seed.sql, reset.ts
│   │   ├── collector/  # Bright Data scrapers, licence matching and the job worker
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

Licence checks need DCA's public licensee files in `data/`. The steps are in `docs/smoke-test.md` under "Licence lookup". The app runs without them; licences then show as not checked.

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

### Collector run order

Run by hand against the database in `.env.local`, in this order:

1. `npx tsx --env-file=.env.local src/backend/collector/directory.ts --insurer "Cigna" --zip 92101 --limit 50`: directory scrape, one city per run; stores the plan network name in `plan`
2. `npx tsx --env-file=.env.local src/backend/collector/evidence.ts --all`: evidence pages, plus `booking_url` and `booking_source` when a matched page has a booking link
3. `npx tsx --env-file=.env.local src/backend/collector/linetype.ts --all`: Twilio line type for each listing still `unknown` (about 1 cent per number)
4. `npm run verify -- --all`: verdicts

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
