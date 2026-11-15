# 21 Data contract: booking links, line type, self-pay and caller reports (GitHub #45)

**Owner:** Aditya · **Priority:** P0 · **Time box:** 1 h · **Depends on:** nothing · **Blocks:** #46, #47, #48, #50, #51, #52 · **Do this first**

## Why

The planning round on Saturday evening (`docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md`) changed what a listing has to carry. Judges said TheraCheck "feels like a search engine" and asked whether calling is the only way to book. The answer is a booking flow with three paths, and each path needs data the database does not hold today:

1. **Book online** needs the therapist's booking link.
2. **The AI agent checks for you** is only allowed for landlines, so each office number needs a line type.
3. **Call them yourself** ends with the user's one-tap report, which needs a place to live.

A new label, **Pay yourself**, needs a self-pay fact. Every other issue in this round reads these names, so they are fixed here once, with fixtures, before anyone builds on them.

## Before and after

|                     | Before                                     | After                                                                                |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Booking link        | Not stored                                 | `listings.booking_url`, `listings.booking_source`                                    |
| Office line type    | Not stored                                 | `listings.phone_line_type`: `landline`, `mobile`, `voip`, `unknown`                  |
| Self-pay            | Only a posted price                        | `verdicts.sees_self_pay`: `yes`, `no`, `unknown`                                     |
| Who made a call     | Every call is the agent's                  | `calls.source`: `agent` or `caller` (a user's one-tap report)                        |
| Labels              | 5                                          | 8: adds `Pay yourself`, `Caller reported: available`, `Caller reported: unavailable` |
| Production database | Changed only by `db:reset`, which wipes it | A migration file that only adds columns, safe to run on the live database            |
| Fixtures            | No listing exercises the three paths       | At least one seed listing per path, and one `Pay yourself` listing                   |

## What to build

**1. Schema.** In `src/backend/db/schema.sql` (used by `db:reset` and the Docker tests):

- `listings`: `booking_url text`, `booking_source text check (booking_source in ('zocdoc', 'headway', 'alma', 'rula', 'practice_site'))`, `phone_line_type text not null default 'unknown' check (phone_line_type in ('landline', 'mobile', 'voip', 'unknown'))`.
- `verdicts`: `sees_self_pay text not null default 'unknown' check (sees_self_pay in ('yes', 'no', 'unknown'))`.
- `calls`: `source text not null default 'agent' check (source in ('agent', 'caller'))`.

**2. Migration for the live database.** `src/backend/db/migrations/002-booking-lines-selfpay.sql` with the same columns as `alter table … add column if not exists …`. It must be safe to run twice and must never drop or rewrite data. Add an npm script `db:migrate` that applies every file in `src/backend/db/migrations/` in name order against `.env.local`'s `DATABASE_URL`. Do not run it against production yourself: Waleed owns the live database and runs it after this merges.

**3. Types (`src/shared/types.ts`).**

- `Label` gains `"Pay yourself"`, `"Caller reported: available"`, `"Caller reported: unavailable"`.
- `PhoneLineType = "landline" | "mobile" | "voip" | "unknown"`, `BookingSource = "zocdoc" | "headway" | "alma" | "rula" | "practice_site"`.
- `Listing` gains `bookingUrl: string | null`, `bookingSource: BookingSource | null`, `phoneLineType: PhoneLineType`.
- `Verdict` gains `seesSelfPay: Tri`.
- `Call` gains `source: "agent" | "caller"`.
- `ListingSummary` gains `bookingUrl`, `bookingSource`, `phoneLineType`, `plan: string`, `seesSelfPay: Tri`, and `sourceCount: number` (how many distinct evidence sources were checked, plus 1 for the directory).

**4. Fixtures (`src/backend/db/seed.sql`).** Keep the 12 listings and their ids. Set, on the existing rows:

- two listings with a `booking_url` on `https://example.com/book/…` (one `zocdoc`, one `practice_site`), landline
- three listings with no booking link and `phone_line_type = 'landline'`
- three listings with `phone_line_type = 'mobile'`
- one listing whose verdict is `lists_insurer = 'no'`, `sees_self_pay = 'yes'`, with a posted fee
- the rest `unknown`

All URLs stay on `example.com`; every name and number stays made up.

**5. Labels in the UI.** `src/frontend/LabelBadge.tsx` must render the three new labels (text, icon, colour) so nothing crashes when later issues return them. Pick calm colours: `Pay yourself` is neutral (not a warning), the two caller labels match the two demo-call labels.

## Not in this issue

Filling these fields from real data (#46), the score and verifier changes (#47), the API (#48), any page changes beyond the badge (#51, #52).

## Files

- Create: `src/backend/db/migrations/002-booking-lines-selfpay.sql`, `src/backend/db/migrate.ts`
- Modify: `src/backend/db/schema.sql`, `src/backend/db/seed.sql`, `src/shared/types.ts`, `src/frontend/LabelBadge.tsx`, `package.json` (script), `src/backend/queries.ts` (only so it still type-checks: map the new columns into the existing shapes)

## Interfaces

- **Produces:** every column, type and label named above, exactly as spelled. Later issues use these names without asking.

## Acceptance check

- `npm run db:test:reset` then `npm run test:int` passes, and a new integration test checks the seed has at least one listing per path (booking link; landline without link; mobile without link) and one `sees_self_pay = 'yes'` verdict.
- Running the migration twice against the Docker database succeeds both times and leaves the row counts unchanged (test it).
- `npm run typecheck` passes; every new label renders in `LabelBadge` (unit test).
- Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md, docs/issues/21-contract-booking-lines-selfpay.md and docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md.
Read src/backend/db/schema.sql, seed.sql, reset.ts, src/shared/types.ts, src/backend/queries.ts and src/frontend/LabelBadge.tsx as they are now.

Test first: add an integration test for the seed coverage and the run-twice migration, and a unit test that LabelBadge renders the three new labels. Run them and see them fail.
Then make the schema, migration, migrate script, types, seed and badge changes exactly as the issue names them. Map the new columns in queries.ts only as far as needed to type-check; the API work is #48.
Never run db:reset or db:migrate against .env.local. Use the Docker database (npm run db:test:up, db:test:reset, test:int); check docker ps first, because other worktrees share ports 5432 and 4444.
Run the full local CI sequence. Commit with plain conventional commits, no co-author trailer. Do not push.
```
