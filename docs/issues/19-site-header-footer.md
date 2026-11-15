# 19 Site header and footer on every page (GitHub #39)

**Owner:** Tracy (Qinggin) · **Priority:** P1 · **Time box:** 1.5 h · **Depends on:** nothing. Touches `src/app/page.tsx` and `src/app/globals.css`, so do not work on it at the same time as #14, #21 or #40.

## Why

Today the header is a logo and nothing else, and each page adds it by hand (`src/app/page.tsx`, `src/app/listing/[id]/page.tsx`, `src/app/listing/[id]/not-found.tsx`, `src/app/error.tsx`). There is no footer, no way to reach a privacy or terms page, and a new page gets no header unless someone remembers to add one.

## Before and after

|                | Before                               | After                                                                        |
| -------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Header         | Logo only, added page by page        | Logo, two links and the 988 line, added once in the root layout              |
| Footer         | None                                 | On every page: four links, the "public web pages" line, the demo-call line   |
| Privacy, Terms | No pages                             | Placeholder pages at `/privacy` and `/terms` (real wording is a later issue) |
| A new page     | No header or footer unless added     | Gets both without any code                                                   |
| Keyboard users | Tab through the header on every page | "Skip to main content" is the first tab stop                                 |

## What to build

**1. Shell in the root layout.** `src/app/layout.tsx` renders, in this order: a skip link, `<Header />`, `{children}`, `<Footer />`, all inside the existing `.page` wrapper. Remove `<Header />` and the `.page` wrapper from the four files that add them today. Each page keeps its own `<main>`; give every `<main>` `id="main"` so the skip link has a target.

**2. Header (`src/frontend/Header.tsx`).**

- The logo, linking to `/` (keep the sunrise mark).
- A `<nav aria-label="Main">` with two links: "Find therapists" (`/`) and "How it works" (`/how-it-works`).
- On the right: "In crisis? Call or text 988", where "988" is a `tel:988` link. It is text, not a button, and it must not look like an alarm.
- At 320px wide the header may wrap to two lines. No hamburger menu: two links fit, and a menu needs JavaScript.

**3. Footer (`src/frontend/Footer.tsx`).** A `<footer>` with:

- A `<nav aria-label="Footer">` with four links: "Privacy" (`/privacy`), "Terms" (`/terms`), "How it works" (`/how-it-works`), "Accessibility" (`/accessibility`).
- The line "Based on public web pages. Only the office can confirm." Move it here from `src/app/page.tsx` and `src/app/listing/[id]/page.tsx` (the `.honest` paragraph), so it shows once on every page.
- The line "Every call on this site is a demo call. No real office is contacted."
- "TheraCheck is a SanD Hacks 2026 project." and a link "Source on GitHub" to `https://github.com/waleedA13/TheraCheck`.

The footer sits at the bottom of every page. On a short page it rests at the bottom of the window (make `.page` a column with `min-height: 100dvh` and let `main` grow). It is **not** fixed over the content: a fixed bar would cover results on a phone.

**4. Placeholder pages.** Four routes, each a server component with its own `<main id="main">`, an `<h1>`, the sentence "This page is being written.", and a link "Back to search" to `/`:

| Route            | `<h1>` and page title |
| ---------------- | --------------------- |
| `/privacy`       | Privacy               |
| `/terms`         | Terms                 |
| `/how-it-works`  | How it works          |
| `/accessibility` | Accessibility         |

Use one small shared component so the four files are a few lines each. Set `robots: { index: false }` in each page's metadata until the real text exists. Do not write any legal wording in this issue.

## Files

- Create: `src/frontend/Footer.tsx`, `src/frontend/Placeholder.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/how-it-works/page.tsx`, `src/app/accessibility/page.tsx`, `e2e/shell.spec.ts`
- Modify: `src/app/layout.tsx`, `src/frontend/Header.tsx`, `src/app/page.tsx`, `src/app/listing/[id]/page.tsx`, `src/app/listing/[id]/not-found.tsx`, `src/app/error.tsx`, `src/app/globals.css`, `e2e/home.spec.ts` (only if it breaks)

## Interfaces

- **Consumes:** nothing.
- **Produces:** `<Header />` and `<Footer />` rendered by the layout. Pages must not render either. Every page's `<main>` has `id="main"`.

## Acceptance check

- `/`, `/listing/<a seeded id>`, `/listing/not-a-real-id`, `/privacy`, `/terms`, `/how-it-works` and `/accessibility` each show exactly one header and one footer.
- Every footer and header link opens a page that returns 200.
- The first Tab press on any page focuses "Skip to main content", and Enter moves focus to the main content.
- With JavaScript disabled, the header, footer and all links still work.
- At 320px wide there is no sideways scrolling, and every link is at least 44px tall.
- On `/privacy` (a short page) the footer rests at the bottom of the window, and on `/` it comes after the last result, never on top of it.
- "Based on public web pages. Only the office can confirm." appears once per page.
- `e2e/shell.spec.ts` checks the first two points on desktop and phone sizes. `npm run format:check`, `lint`, `typecheck`, `test:unit` and `test:e2e` pass.

## Prompt for your Claude

```
Read CLAUDE.md, AGENTS.md, and docs/issues/19-site-header-footer.md. This is Next.js 16: read the layout and metadata guides in node_modules/next/dist/docs/ before editing src/app/layout.tsx.
Read src/app/layout.tsx, src/frontend/Header.tsx, src/app/page.tsx, src/app/listing/[id]/page.tsx, src/app/listing/[id]/not-found.tsx, src/app/error.tsx and src/app/globals.css as they are now.

Write e2e/shell.spec.ts first: for each of /, /privacy, /terms, /how-it-works and /accessibility, expect exactly one banner landmark and one contentinfo landmark, expect each footer link to return 200, and expect the first Tab press to focus the "Skip to main content" link. Run it and see it fail.

Then move the shell into src/app/layout.tsx: skip link, Header, children, Footer, inside the .page wrapper. Remove Header and the .page wrapper from the four files that render them, and give every <main> id="main".
Extend src/frontend/Header.tsx with the two nav links and the 988 line. Create src/frontend/Footer.tsx with the four links and the lines in the issue, and move the "Based on public web pages" line out of the two pages into it.
Create src/frontend/Placeholder.tsx and the four placeholder pages. Do not write privacy or terms wording; the sentence in the issue is the whole body.
Style everything in src/app/globals.css with the existing variables and fonts. Use the frontend-design skill for the look: calm, high contrast, large type, the same feel as the results page. The 988 line is plain text with a link, not a red banner. The footer is in the page flow, not fixed.

Check 320px, 390px and 1280px widths, keyboard-only, and JavaScript disabled, and show me screenshots.
Only touch the files listed in the issue. Do not commit; show me the diff and a proposed commit message.
```
