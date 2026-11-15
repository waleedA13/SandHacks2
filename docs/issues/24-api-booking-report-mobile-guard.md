# 24 API: booking fields, source count, caller reports and the mobile guard (GitHub #48)

**Owner:** Aditya · **Priority:** P0 · **Time box:** 1.5 h · **Depends on:** #45, #47

## Why

The pages (#51) choose a booking path per listing, so the API has to say which paths are open. The "Call them yourself" path ends with a one-tap report that needs an endpoint. And the AI agent must never place a call to a mobile number: since February 2024 the FCC treats AI voices as "artificial voice" under the TCPA, and calls with one to a mobile need the called person's prior consent. Today `POST /api/calls/start` checks only the demo allow-list.

## Before and after

|                                      | Before                       | After                                                                                             |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Listing responses                    | No booking or line data      | `bookingUrl`, `bookingSource`, `phoneLineType`, `plan`, `seesSelfPay`, `sourceCount`, and `paths` |
| Which buttons to show                | The page guesses             | `paths`: an ordered list from `book_online`, `agent_check`, `call_yourself`                       |
| User reports after calling           | No endpoint                  | `POST /api/listings/[id]/report`                                                                  |
| Agent call to a mobile office number | Allowed if on the allow-list | Refused with 403 unless the line type is `landline`                                               |

## What to build

**1. Read routes.** `listSummaries` and `getDetail` return the new fields from #45, plus:

- `sourceCount`: distinct evidence sources for the listing, plus 1 for the directory.
- `paths`, worked out in one shared function `bookingPaths(listing)` in `src/backend/queries.ts`:
  - `book_online` if `bookingUrl` is set
  - `agent_check` if there is a phone and `phoneLineType` is `landline`
  - `call_yourself` if there is a phone (always, as the fallback)
  - order: as listed. A listing with no phone and no link gets `[]`.

**2. `POST /api/listings/[id]/report`.** Body `{ answered: "yes" | "no", acceptingNew: "yes" | "no" | "unknown" }`. Inserts a `done` call with `source = 'caller'`, `takesPlan = 'unknown'` (the user is not asked), `acceptingNew` from the body, and summary "Reported by someone who called." If `answered` is `no`, store `acceptingNew = 'unknown'` and summary "Someone called and nobody answered." Returns the listing's new `{ score, label }`.

- 400 for a bad body or id, 404 for an unknown listing.
- Abuse guard: one report per listing per 60 seconds, the same pattern as `claimCallSlot`. Return 429 inside the window.
- Store nothing about the reporter: no IP, no cookie, no user agent.

Decide and document how a "nobody answered" report affects the score. Proposal: three "nobody answered" reports within 7 days set the label to `Caller reported: unavailable`; one alone changes nothing. Keep it in `score.ts` or `queries.ts`, tested.

**3. Mobile guard in `POST /api/calls/start`.** Before the allow-list check, look up the listing's `phone_line_type`. If it is not `landline`, return 403 `{ error: "We only place assistant calls to office landlines." }`. During the hackathon the allow-listed teammate phones still ring, so the demo is unchanged: the guard reads the **listing's** line type, not the number dialled.

## Files

- Create: `src/app/api/listings/[id]/report/route.ts` (+ tests)
- Modify: `src/backend/queries.ts`, `src/app/api/calls/start/route.ts`, their tests, `src/shared/types.ts` only if #45 missed a field

## Interfaces

- **Consumes:** #45's columns and types; #47's `scoreVerdict`.
- **Produces:** `paths: ("book_online" | "agent_check" | "call_yourself")[]` and the other fields on `ListingSummary` and the detail response; `POST /api/listings/[id]/report`.

## Acceptance check

- Integration tests on the seed data: each of the three path combinations returns the right `paths`; a mobile-only listing never includes `agent_check`.
- Report route: yes/yes on a listing moves it to `Caller reported: available`; a second report within 60 s gets 429; a bad body gets 400; the stored call has `source = 'caller'` and no personal data.
- Calls/start: a listing whose line type is `mobile`, `voip` or `unknown` returns 403 even with an allow-listed number; `landline` proceeds to the existing checks.
- Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md (Next.js 16: read the route handler guide in node_modules/next/dist/docs/ first), docs/issues/24-api-booking-report-mobile-guard.md, docs/issues/21-contract-booking-lines-selfpay.md and docs/issues/23-verifier-score-selfpay.md.
Read src/backend/queries.ts, src/app/api/calls/start/route.ts, src/app/api/listings/[id]/route.ts and their tests.

Write the failing integration and unit tests from the acceptance check first. Then add bookingPaths, the new response fields, the report route with its 60-second guard, and the line-type guard in calls/start.
Use the security-audit skill on the report route and the guard: input validation, no personal data stored, no way to bypass the guard with a crafted body.
Never read .env.local or run db:reset. Docker database only; check docker ps first.
Run the full local CI sequence. Commit with plain conventional commits, no co-author trailer. Do not push.
```
