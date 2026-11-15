# 08 Search and ranked results page

**Owner:** Tracy · **Priority:** P0 · **Time box:** 2.5 h · **Depends on:** 01 (build on fixtures; switch to the API when 06 lands)

## User stories

- US-F1-M: pick insurer and city, see the likeliest therapists first.
- US-F1-R: a short list in large text with a tap-to-call number.
- US-F1-E: plain words and clear labels.
- US-F1-D: the whole ranked list on one page.
- US-F6-M, US-F6-R, US-F6-E, US-F6-D: one sentence on how many listings look reachable.

## What to build

The home page. One screen, top to bottom:

1. **Headline and one line of explanation.** For example: "Find a therapist who will actually pick up."
2. **Search:** an insurer select and a city select, both labelled, and one button. The insurer is the one from issue 02. The cities are the six California cities in the plan's "Scope", with San Diego first; only list a city once it has listings in the database. The search is a normal link with query parameters so results can be shared.
3. **Accuracy sentence (F6):** "Of 40 Aetna listings in San Diego, 12 look reachable." Plain sentence, not a chart.
4. **Results:** one card per listing, highest score first. Each card shows name and credential, the label as text with a colour and an icon (never colour alone), the one-line reason, office phone as a `tel:` link, "Last checked" date, and a link to the detail page.
5. **Honesty note** under the list: "Based on public web pages. Only the office can confirm."

States to design:

- **Empty (Review Focus 4):** "We don't have listings for that insurer and city yet. Try Aetna in San Diego."
- **Loading and error:** plain text, no spinner-only screens.

Use the label wording from the plan exactly: `Likely available`, `Unclear`, `Likely dead end`, `Demo call: available`, `Demo call: unavailable`.

## Files

- Create: `app/page.tsx`, `components/SearchForm.tsx`, `components/ListingCard.tsx`, `components/AccuracyBanner.tsx`, `components/LabelBadge.tsx`, `app/globals.css`

## Interfaces

- **Consumes:** `listSummaries(insurer, city)` and `getStats(insurer, city)` from `lib/queries.ts` (server-side), or the fixtures directly until issue 06 is merged. Type `ListingSummary`.
- **Produces:** `<LabelBadge label />` and `<ListingCard listing />`, reused by issue 09.

## Acceptance check

- The page is server-rendered: with JavaScript disabled in the browser, a search still returns results.
- At 320px wide there is no sideways scrolling and every tap target is at least 44px tall.
- With the fixtures, 12 cards appear in descending score, and the fixture with a call shows its `Demo call` badge.
- A search for an insurer with no data shows the empty message.
- Phone numbers open the dialler on a real phone.
- Lighthouse accessibility score of 95 or more on the results page.

## Prompt for your Claude

```
Read CLAUDE.md, the plan's "Personas", "Features and user stories" and "Shared contract", and docs/issues/08-search-results-page.md.
Use the frontend-design skill for the visual direction. The audience includes a stressed 24-year-old on a phone and a 67-year-old with low vision: calm, high contrast, large type, nothing playful.

Build app/page.tsx as a server component that reads insurer and city from the query string and renders the five sections in the issue.
Build SearchForm as a plain GET form that works without JavaScript. Build LabelBadge with text + icon + colour for the five labels in the plan. Build ListingCard and AccuracyBanner.
Read data through listSummaries and getStats from lib/queries.ts; if that file does not exist yet, read the same shapes from a local fixture and leave one clearly marked line to swap.
Mobile-first single column; it may widen to two columns above 900px. Minimum body text 18px. Meet WCAG AA contrast.
Check it at 320px, 390px and 1280px widths, and with JavaScript disabled, and show me screenshots.
Only touch app/page.tsx, app/globals.css and components/. Do not commit; show me the diff and a proposed commit message.
```
