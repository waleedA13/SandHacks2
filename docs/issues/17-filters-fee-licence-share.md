# 17 Filters, fee, licence and share on the pages

**Owner:** Tracy · **Priority:** P1 · **Time box:** 2 h · **Depends on:** 08, 09, 16 (build on the fixtures until 16 lands)

Start only after the Sat 9 PM checkpoint shows the core working. The four parts are independent; ship them in this order and stop when time runs out.

## User stories
- **Share:** US-F10-M, US-F10-R, US-F10-E, US-F10-D.
- **Filters:** US-F7-M, US-F7-R, US-F7-E, US-F7-D.
- **Fee:** US-F8-M, US-F8-R, US-F8-E, US-F8-D.
- **Licence:** US-F9-M, US-F9-R, US-F9-E, US-F9-D.

## What to build

**1. Send me my shortlist (results page).** A "Send me the top 3" button above the results. No account, no server, and nothing about the user is stored.
- On phones it opens the device's own share sheet (Messages, WhatsApp, email) with the text below.
- Where the browser has no share sheet, show two fallbacks: "Copy" and "Text it to me" (an `sms:` link with the text filled in).
- A "Print" link, with a print style that shows only the list.
- The text: a first line "Therapists most likely to pick up ({insurer}, {city})", then for each of the top three: name, label, phone. Last line: the link to these results with the current filters.

**2. Fit filters (results page).** Under the search: a "What do you need help with?" select (the plan's fixed specialties, in plain words such as "Teenagers", "Grief and loss"), a "Language" select (only languages present in the data), and a "Video or phone sessions" checkbox. They are part of the same GET form, so filters stay in the URL and work without JavaScript. Show "Showing 6 of 40" and a "Clear filters" link. With filters on and no matches: "No listings match all of these. Try removing one."

**3. Self-pay price (card and detail page).** One line where a fee exists: "Their posted price: $150 a session" or "$80 to $160 a session". On the detail page add: "This is the therapist's own price if you pay yourself. It is not what your insurance charges." With no fee, show nothing on the card and "No price posted" on the detail page.

**4. Licence (detail page).** One row in "What we found":
- `active`: "California licence: active", linking to the board record in the sources list.
- `inactive`: "California licence: not active", shown as a warning.
- `not_found` or `unchecked`: "We could not match a licence record." Never word this as "unlicensed".
- Discipline `yes`: add "The board lists a disciplinary action. See the board's record."

## Files
- Create: `components/ShareShortlist.tsx`, `components/FitFilters.tsx`
- Modify: `app/page.tsx`, `components/SearchForm.tsx`, `components/ListingCard.tsx`, `app/listing/[id]/page.tsx`, `components/FactRow.tsx`, `app/globals.css`

## Interfaces
- **Consumes:** `listSummaries(insurer, city, filters)` and the new `ListingSummary` and detail fields from issue 16.
- **Produces:** nothing other issues depend on.

## Acceptance check
- On a real phone, "Send me the top 3" opens the share sheet and the message arrives with three names, phones and a working link.
- On desktop Firefox the copy and text fallbacks appear, and copying is confirmed in words a screen reader announces.
- With JavaScript off, the filters still work and the share button is replaced by a plain line showing the link.
- Opening a filtered link in a private window shows the same filtered list.
- A fixture with no fee shows no price line on its card; one with an inactive licence shows the warning; one with `not_found` shows the neutral sentence.
- Printing the results page gives a clean list with no buttons.
- Everything still fits at 320px.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Features and user stories" (F7 to F10), "Shared contract" and "Fixed vocabularies", and docs/issues/17-filters-fee-licence-share.md.

Build the four parts in the order given, each one finished before the next.
1. components/ShareShortlist.tsx: a client component that uses navigator.share when available and otherwise shows Copy and an sms: link. It takes the top three listings and the current URL as props. No network calls and nothing stored. Add a print stylesheet.
2. components/FitFilters.tsx: plain form controls inside the existing GET form in SearchForm, mapping the fixed specialty values to plain-word labels. Pass the filters to listSummaries in app/page.tsx. Add the count line, the clear link and the no-match message.
3. The price line on ListingCard and the detail page, with the exact wording in the issue.
4. The licence row in FactRow on the detail page, with the exact wording in the issue. Never write "unlicensed".
Keep the existing visual style. Check at 320px and 1280px and with JavaScript disabled, and show me screenshots.
Only touch app/page.tsx, app/listing/, app/globals.css and components/ (not VoiceWidget.tsx). Do not commit; show me the diff and a proposed commit message.
```
