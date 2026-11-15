# 27 Listing actions: Book online, Ask the assistant, or Call yourself (GitHub #51)

**Owner:** Tracy (Qinggin) · **Priority:** P0 · **Time box:** 2 h · **Depends on:** #45, #48 (build on the seed fixtures, which cover all three paths)

## Why

Former hackathon winners said TheraCheck "feels like a search engine" and asked whether calling is the only way to book. The planning round agreed a booking flow with three paths, chosen per listing by the API's `paths` field (#48):

1. **Book online** where the therapist has a booking page.
2. **Ask the assistant** (the AI agent checks by phone) where there is no booking page and the office number is a landline.
3. **Call yourself** where the number is a mobile, because the AI agent may not call mobiles without the owner's consent. The user gets a script and, afterwards, one tap to report what happened, which updates the listing for the next person.

The demo shows three listings, one per path.

## Before and after

|                      | Before                                                | After                                                                                                         |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Listing card         | Phone number and "See details"                        | The first available action as the main button, the others as secondary links                                  |
| Detail page          | "Confirm by phone" with the voice widget for everyone | "How to book" panel with the paths this listing has, in order                                                 |
| Booking online       | Not offered                                           | "Book online with Zocdoc" (or the source's name), opening the booking page in a new tab                       |
| Mobile office number | The assistant could be offered                        | Only "Call yourself": tap-to-call, a three-line script, then "Did they answer? Are they taking new patients?" |
| After a self-call    | Nothing                                               | One tap sends the report; the badge updates on the spot                                                       |

## What to build

**1. Card (`src/frontend/ListingCard.tsx`).** Main button by the first entry in `paths`:

- `book_online` → "Book online" (opens `bookingUrl`, `target="_blank" rel="noopener noreferrer"`)
- `agent_check` → "Ask the assistant to call" (links to the detail page's call panel)
- `call_yourself` → "Call {phone}" (`tel:` link)

Show the other paths as smaller links. A listing with `paths` empty shows "No way to contact listed."

**2. Detail page "How to book" panel (`src/app/listing/[id]/page.tsx`).** Replace "Confirm by phone" with "How to book". Show each path in order:

- **Book online:** button "Book online with {source name}", the line "You'll book on their site. Check the booking says it takes {plan}."
- **Ask the assistant:** the existing `CallPanel` and `VoiceWidget`, unchanged.
- **Call yourself:** a `tel:` button, then a short script the user can read aloud:
  1. "Hi, I'm looking for a therapist. Do you take {insurer} {plan}?"
  2. "Is {name} taking new patients?"
  3. "What's the earliest appointment?"

  Then a small form: "Did they answer?" (Yes / No) and, if yes, "Are they taking new patients?" (Yes / No / Not sure), and "Send". It posts to `POST /api/listings/[id]/report` and updates the badge through the existing `LabelProvider`. Without JavaScript the form still posts and the page reloads with the new label.

**3. Wording.** Plain, calm, short. Never say a therapist "is in network"; say "Check the booking says it takes {plan}." Use the stop-slop skill for every line.

## Files

- Create: `src/frontend/BookingPanel.tsx`, `src/frontend/CallYourself.tsx`
- Modify: `src/frontend/ListingCard.tsx`, `src/app/listing/[id]/page.tsx`, `src/frontend/CallPanel.tsx` (only if the panel needs a prop), `src/app/globals.css`, `e2e/` (new spec)

## Interfaces

- **Consumes:** `paths`, `bookingUrl`, `bookingSource`, `phoneLineType`, `plan` from #48; `POST /api/listings/[id]/report`.
- **Produces:** nothing other issues depend on.

## Acceptance check

- With the seed data: the booking-link listing's card says "Book online"; a landline listing's card says "Ask the assistant to call"; a mobile listing's card says "Call {phone}" and its detail page has no voice widget.
- Sending a self-call report changes the badge without a reload, and with JavaScript disabled it changes after the reload.
- A second report within 60 seconds shows "Thanks, we already have a report for this listing. Try again in a minute."
- At 320px wide nothing scrolls sideways; every button is at least 44px tall; keyboard-only use works; the form has labels.
- An e2e spec covers the three cards and the report form. Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md (Next.js 16: read the guides in node_modules/next/dist/docs/ first), docs/issues/27-listing-booking-actions.md, docs/issues/21-contract-booking-lines-selfpay.md, docs/issues/24-api-booking-report-mobile-guard.md and the direction notes in docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md.
Read src/frontend/ListingCard.tsx, CallPanel.tsx, VoiceWidget.tsx, LabelBadge.tsx and src/app/listing/[id]/page.tsx as they are now.

Write the e2e spec first (three cards, the report form) and see it fail. Then build BookingPanel and CallYourself, change the card and the detail page as the issue says, and keep CallPanel's behaviour for the assistant path.
Use the frontend-design skill for the look: calm, high contrast, large type, the same feel as the existing pages. Use the stop-slop skill for every line of copy. The audience includes a 67-year-old with low vision and a stressed 24-year-old on a phone.
Check 320px, 390px and 1280px widths, keyboard-only and JavaScript disabled, and show me screenshots.
Never read .env.local or run db:reset. Commit with plain conventional commits, no co-author trailer. Do not push.
```
