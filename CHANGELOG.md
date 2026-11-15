# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Licence evidence for therapists from the California DCA licensee files, matched by licence number (NPI Registry, Psychology Today) or by name and city ([ADR 0002](docs/adr/0002-licence-data-from-dca-files.md)).
- CI workflow with static, unit, integration and e2e stages. Integration and e2e tests run against Postgres in Docker behind the local Neon HTTP proxy, with no secrets.
- Prettier, `typecheck`, `audit`, Vitest unit and integration projects, and Playwright e2e on desktop and phone sizes.
- Repository scaffolding: community health files, issue and PR templates, security policy, CI secret and dependency scanning, and Dependabot.
