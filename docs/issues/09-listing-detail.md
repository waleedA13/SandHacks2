# 09 Listing detail with evidence and call panel

**Owner:** Tracy · **Priority:** P0 · **Time box:** 2 h · **Depends on:** 08, 06; the call panel needs 07

## User stories
- US-F2-M: one line saying why a listing ranks where it does.
- US-F2-R: the reason in one large sentence.
- US-F2-E: when it was last checked.
- US-F2-D: links to the source pages.
- US-F3-M, US-F3-R: start the confirm call from this page.
- US-F3-E: the call result in plain words.
- US-F3-D: confirmed results look different from web-based guesses.

## What to build
The page for one listing, top to bottom:

1. **Name, credential, label badge, tap-to-call phone, address.**
2. **Why:** the reason sentence in large text, then "Last checked {date}".
3. **What we found:** three rows, each with a plain question and a yes / no / "we couldn't tell" answer:
   - Still practising here?
   - Lists this insurer?
   - Taking new patients?
4. **Sources:** each evidence item as the source's name, a short excerpt, the date fetched, and a link that opens the original page.
5. **Confirm by phone:** the `<VoiceWidget mode="confirm" />` from issue 07 with a one-line explanation: "Our assistant will ask the office two questions for you." When the call finishes, the badge and score on the page update without a reload, and the result appears as "Demo call on {date}: {summary}", followed by "No real office was contacted."
6. **Back to results** link that keeps the search.

States to design:
- No evidence: "We found no other information about this listing."
- Earlier call exists: show it above the widget.
- Listing not found: a plain message and a link home.

## Files
- Create: `app/listing/[id]/page.tsx`, `components/FactRow.tsx`, `components/SourceList.tsx`, `components/CallPanel.tsx`

## Interfaces
- **Consumes:** `getDetail(id)` from `lib/queries.ts`; `<LabelBadge />` from issue 08; `<VoiceWidget mode="confirm" listingId name insurer onDone />` from issue 07.
- **Produces:** `<CallPanel listing />`, the client component that wraps the widget and shows the result. Issue 11 adds the re-check button beside it.

## Acceptance check
- A fixture listing with evidence shows three fact rows and its sources; each source link opens in a new tab.
- A fixture listing with no evidence shows the no-information message and no empty sections.
- After a confirm call that ends "we're full", the badge changes to `Demo call: unavailable` on this page without a reload, and the results page shows the listing at the bottom.
- The page reads sensibly with a screen reader: heading order is correct and the badge change is announced.
- At 320px wide there is no sideways scrolling.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Personas", "Features and user stories" and "Shared contract", and docs/issues/09-listing-detail.md. Read components/VoiceWidget.tsx to see its props; do not change it.

Build app/listing/[id]/page.tsx as a server component using getDetail from lib/queries.ts, with the six sections in the issue and the three states.
Build FactRow (question, tri-state answer shown as Yes / No / We couldn't tell, with icon and text), SourceList and CallPanel.
CallPanel is a client component: it renders VoiceWidget in confirm mode, and on onDone updates the badge and shows the confirmed result in an aria-live region.
Keep the visual language from issue 08. Reuse LabelBadge.
Check at 320px and 1280px and with a screen reader, and show me screenshots.
Only touch app/listing/ and components/ (not VoiceWidget.tsx). Do not commit; show me the diff and a proposed commit message.
```
