# 22 Collector: booking links, office line type and plan name (GitHub #46)

**Owner:** Waleed · **Priority:** P0 · **Time box:** 1.5 h · **Depends on:** #7, #8, #45

## Why

The new booking flow picks one of three paths per listing (`docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md`):

1. **Book online** when the therapist has a booking page.
2. **The AI agent checks for you** when there is no booking page and the office number is a **landline**.
3. **Call them yourself** with a script when the number is a **mobile**. Federal rules treat AI voices as "artificial voice", and those calls to mobiles need the person's prior consent (FCC ruling, Feb 2024), which we do not have from a therapist.

#45 adds the columns. This issue fills them from real data while the collectors already have each therapist's pages open, so nothing new is scraped while a user waits.

## Before and after

|                  | Before                                      | After                                                                     |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Booking link     | Unknown                                     | `booking_url` and `booking_source` set when one is found, else null       |
| Office line type | Unknown, so the agent might call a mobile   | `phone_line_type` from a number lookup, done once per listing             |
| Plan             | Stored, but its exact network name may vary | `plan` holds the network name we searched, for example `Open Access Plus` |
| Page             | Every listing gets the same "call" button   | Each listing can show the right path (pages come in #51)                  |

## What to build

**1. Booking link detection (in the evidence collector, #8).** While a listing's pages are fetched, look for a booking link, first match wins:

| Where             | What counts                                                                                                                                                                             | `booking_source` |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| A Zocdoc profile  | The profile URL itself                                                                                                                                                                  | `zocdoc`         |
| A Headway profile | The profile URL                                                                                                                                                                         | `headway`        |
| An Alma profile   | The profile URL                                                                                                                                                                         | `alma`           |
| A Rula profile    | The profile URL                                                                                                                                                                         | `rula`           |
| The practice site | A link whose host is a known practice booking system (SimplePractice, TherapyNotes, Jane, IntakeQ, TherapyAppointment), or a link labelled "Book", "Schedule", "Request an appointment" | `practice_site`  |

Store the URL only. Do **not** open booking calendars or read slots: their terms of use have not been read. A profile only counts if the identity check already used for evidence matches (shared names need a phone match).

**2. Line type lookup.** For each listing with a phone number, look up its line type once and store `landline`, `mobile`, `voip` or `unknown`. Twilio Lookup (line type intelligence) works with the team's Twilio account; it needs the account SID plus the existing API key, and costs about a cent per number. Put it in one new file, `src/backend/collector/linetype.ts`, the only file that calls it. If the lookup fails, store `unknown`; never guess.

**3. Plan name.** `plan` holds the network the directory search used, as the user would read it on their card, for example `Open Access Plus`. One value per scrape; keep the insurer in `insurer`.

**4. Run order.** Directory scrape (7) → evidence (8, now also booking links) → line type → verifier (`npm run verify -- --all`). Document the sequence in `README.md` under the collector commands.

## Not in this issue

Reading booking calendars, calling anyone, the self-pay fact (#47), any page changes.

## Files

- Create: `src/backend/collector/linetype.ts` (+ unit test with `fetch` mocked)
- Modify: the evidence collector from #8, the directory collector from #7 (plan name), `.env.example` (add `TWILIO_ACCOUNT_SID` if needed), `README.md`

## Interfaces

- **Consumes:** columns from #45.
- **Produces:** filled `booking_url`, `booking_source`, `phone_line_type`, `plan` on real listings.

## Acceptance check

- Unit tests: booking detection returns the right source for one sample of each row of the table above and null for a page with none; line type maps the lookup's answers to the four values and returns `unknown` on an error.
- After a real San Diego run, print counts: listings with a booking link, and listings per line type. Paste them in the PR; they go in the pitch.
- Hand-check five booking links: each opens the right therapist's booking page.
- No test calls Bright Data or Twilio. Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md, docs/issues/22-collector-booking-lines.md, docs/issues/21-contract-booking-lines-selfpay.md and the direction notes in docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md.
Read the collector code from #7 and #8 and src/backend/collector/brightdata.ts as they are now.

Write unit tests first for booking-link detection (one sample per source in the issue's table, plus none) and for the line-type mapping, with fetch mocked. See them fail.
Add booking detection to the evidence collector using pages it already fetches; store the URL only and never open a calendar. Add src/backend/collector/linetype.ts as the only file that calls the lookup service; store unknown on any failure.
Make the directory collector store the plan network name in plan.
Never run db:reset against .env.local. Run the real collectors only against the team database, after the migration from #45 has been applied.
Run the full local CI sequence, then do a real San Diego run and report the counts the issue asks for. Commit with plain conventional commits, no co-author trailer.
```
