# TheraCheck

[![Security](https://github.com/waleedA13/TheraCheck/actions/workflows/security.yml/badge.svg)](https://github.com/waleedA13/TheraCheck/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

> Our project for **SanD Hacks Fall 2026**. TheraCheck ranks an insurer's therapist listings by how likely each one is to answer and take new patients, and a voice agent confirms by asking the office.

## Overview

- **Problem:** insurance directories list therapists who have moved, retired, stopped taking the plan or are not taking new patients ("ghost networks"). People seeking care burn their energy calling dead ends.
- **Solution:** pick an insurer and city and get the listings ranked by evidence from the therapist's own web pages, with a one-line reason and sources for each. A voice agent can ask the office the two questions that matter. During the hackathon every call goes to a teammate, never a real office.
- **Tracks:** Bright Data (main), Gemini API, ElevenLabs, Neon.

## Tech stack

| Layer | What we use |
|---|---|
| App | Next.js 16 (App Router, TypeScript), React 19, server-rendered pages |
| Hosting | Vercel |
| Database | Neon Postgres, through `@neondatabase/serverless` (`lib/db.ts`) |
| Scraping | Bright Data Browser API, Web Unlocker and SERP API (`collector/brightdata.ts` only) |
| Reading evidence | Gemini API, Flash tier with structured output (`verifier/gemini.ts` only) |
| Voice | ElevenLabs Agents (`components/VoiceWidget.tsx` only) |
| Tests | Vitest |
| Scripts | `tsx` runs the TypeScript pipeline scripts by hand |
| Runtime | Node.js 24, npm |

The four parts (collector, verifier, web app, voice agent) talk only through the database. Pages and API routes read the database; they never call Bright Data or Gemini while a user waits.

## Repository structure

```
.
├── app/                # Next.js pages and API routes
├── components/         # UI components
├── lib/                # Database client, shared types, scoring (+ tests)
├── db/                 # schema.sql, seed.sql (fixtures) and reset.ts
├── collector/          # Bright Data scrapers and the job worker
├── verifier/           # Gemini verifier
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

| Command | What it does | Needs |
|---|---|---|
| `npm run dev` | Runs the app locally | nothing for the placeholder page; `DATABASE_URL` once pages read data |
| `npm test` | Runs the Vitest suite | nothing |
| `npm run lint` | ESLint | nothing |
| `npm run build` | Production build | nothing today; `DATABASE_URL` once pages read data |
| `npm run db:reset` | Drops all tables, applies `db/schema.sql` then `db/seed.sql` | `DATABASE_URL` (uses `DATABASE_URL_UNPOOLED` if set) |

## Continuous integration

`.github/workflows/security.yml` already runs a Gitleaks secret scan on every push to `main` and every pull request, plus dependency review on pull requests.

A build-and-test workflow should, on pull requests and pushes to `main`:

1. Use Node.js 24 with the npm cache, then `npm ci`.
2. Run `npm run lint`, `npm test` and `npm run build`.

Notes for that workflow:

- No step should need real keys. Never run `npm run db:reset` in CI: it wipes the shared Neon database.
- `lib/db.ts` throws on import when `DATABASE_URL` is missing. If a build starts failing for that reason, set a dummy value in the workflow (for example `postgresql://ci:ci@localhost/ci`), not a real one.
- Vercel deploys every push by itself, so CI does not need a deploy step.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and pull request workflow. Everyone taking part agrees to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please don't open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report one privately.

## License

Released under the [MIT License](LICENSE).
