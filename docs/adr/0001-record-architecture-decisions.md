# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** TheraCheck team

## Context

We are building fast under hackathon time pressure, with several people making technical choices in parallel. Decisions made in chat are easy to lose, and judges and future contributors will ask why the system looks the way it does.

## Decision

We will record each significant architecture decision (stack, data store, hosting, external APIs, major trade-offs) as an Architecture Decision Record in `docs/adr/`, using the format in [`template.md`](template.md).

## Consequences

- Anyone can see why a choice was made without asking the person who made it.
- Writing an ADR costs a few minutes per decision, so we only write them for choices that are hard to reverse.
