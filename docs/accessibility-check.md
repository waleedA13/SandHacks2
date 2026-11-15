# Accessibility and device check

Issue: GitHub #14 (spec: `docs/issues/10-accessibility-device-pass.md`). Checked on 14 Nov 2026.

**Pages checked:** the results page (`/`), its empty state (`/?city=Fresno`), the listing page with and without sources (`/listing/…01`, `/listing/…04`, `/listing/…07`), the listing not-found page and the error page (code review only; it can't be triggered without breaking the database).

**How it was checked.** A production build (`next build` + `next start`) ran in headless Chrome on a Mac. The database was swapped for a temporary copy of `src/backend/db/seed.sql` (12 San Diego listings) because Docker isn't available on this machine. That copy was removed before committing. A script took screenshots and measured sideways scroll, clipped text and tap-target sizes at each width. Real phones and real screen readers were not used. Those rows are marked **open**.

**Words used below:** pass = already worked; fixed = failed and is now fixed; open = not tested, with the reason.

## Lighthouse (accessibility, mobile setting)

| Page                | Before | After |
| ------------------- | ------ | ----- |
| Results `/`         | 100    | 100   |
| Listing (with call) | 100    | 100   |
| Listing not found   | 100    | 100   |
| Empty results       | 100    | 100   |

Lighthouse reported no failed accessibility audits, before or after. The fixes below are for problems Lighthouse can't detect.

## As Robert (low vision, older phone)

| Check                                                          | Result           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200% text size: nothing overlaps or is cut off                 | **fixed**        | Before: every font size was in px, so the browser text-size setting did nothing (body stayed 18px at 200%). Now sizes are in rem and the layout breakpoints in em, so 200% gives 36px body text and the layout drops to fewer columns. At 320px and 390px with 200% text: no sideways scroll, no clipped text. Icons were squashed to dots when text wrapped; they now keep their size. Long phone numbers wrap onto two lines at 320px but stay readable.                         |
| Screen reader: search, open a listing, start and stop the call | **open** (Tracy) | Needs real VoiceOver and TalkBack. Checked in code: labelled selects, `role="search"`, one `h1` per page, then `h2`, then `h3` on cards; each card is an `article` named by its heading; "View details for {name}" and "Call {name} at {number}" links; the call status is `role="status"`; the badge sits in an `aria-live` region (now `aria-atomic` so the whole label is read). The dots in the search pill ("Aetna · San Diego · Change") are now hidden from screen readers. |
| Keyboard only: focus always visible and follows reading order  | **fixed**        | Focus ring (3px teal) showed on every stop and the Tab order matched reading order. Missing: a skip link. Added "Skip to main content" as the first Tab stop; it jumps to `<main id="main">` on every page.                                                                                                                                                                                                                                                                        |
| WCAG AA contrast                                               | **pass**         | All text pairs measured 5.8:1 or higher (lowest: grey text on the pale yellow box). Select borders are 3.6:1. The collapsed search pill's border was 1.4:1; it now uses the same 3.6:1 border as the selects.                                                                                                                                                                                                                                                                      |
| No meaning carried by colour alone                             | **pass**         | Each label is text plus an icon. Yes / No / "We couldn't tell" answers are words. Dead-end cards also sit under a "Likely dead end" heading.                                                                                                                                                                                                                                                                                                                                       |
| Tap targets 44px or more                                       | **pass**         | Script found no link, button, select or summary under 44px at any width.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Error page                                                     | **fixed**        | It had no heading. "We couldn't load the listings." is now the `h1`, matching the not-found page.                                                                                                                                                                                                                                                                                                                                                                                  |

## As Elena (slow connection, plain language)

| Check                                                                                     | Result                  | Notes                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slow 4G: results show in under 3 seconds                                                  | **pass, with a caveat** | Lighthouse mobile simulates Slow 4G and a slow phone CPU. Results page: first text 0.9 s, largest content 2.5 s. The caveat is that the test data was local, so the real database query time isn't included. Tracy should re-run on the live site.                                                                                                                     |
| Plain language                                                                            | **fixed in part**       | One clear win applied: "Fetched {date}" is now "Checked {date}". Other suggestions are waiting for a decision (see below).                                                                                                                                                                                                                                             |
| JavaScript off: search and the listing page work; the call panel says it needs JavaScript | **fixed**               | Search (a plain GET form), the folding search pill and "What to ask" (native `<details>`) and the listing page all worked. The call panel showed a "Start demo call" button that did nothing. It is now hidden and replaced by: "The demo call needs JavaScript, which is turned off in your browser. You can still phone the office yourself using the number above." |

### Plain-language suggestions waiting for a decision

These were left as they are because the spec names them or the right wording is debatable.

| Where                           | Now                                           | Suggested                                                 |
| ------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Search label                    | Insurer                                       | Insurance company                                         |
| Listing facts (spec 09 wording) | Still practising here?                        | Still seeing patients here?                               |
| Listing facts (spec 09 wording) | Lists this insurer?                           | Takes this insurance?                                     |
| Results intro                   | …so you can call the likeliest offices first. | …so you can call the offices most likely to answer first. |
| Results summary                 | Insurer directories are often out of date.    | Insurance company lists are often out of date.            |
| Source name                     | Practice website                              | Their own website                                         |
| Spelling                        | practising, licence (UK)                      | practicing, license (US)                                  |

## Devices and browsers

| Check                       | Result           | Notes                             |
| --------------------------- | ---------------- | --------------------------------- |
| Real iPhone (Safari)        | **open** (Tracy) | Not available here.               |
| Real Android phone (Chrome) | **open** (Tracy) | Not available here.               |
| Desktop Chrome              | **pass**         | Headless Chrome, all four widths. |
| Desktop Safari              | **open** (Tracy) | Not run.                          |
| Desktop Firefox             | **open** (Tracy) | Not installed here.               |
| 320px                       | **pass**         | No sideways scroll on any page.   |
| 390px                       | **pass**         | No sideways scroll on any page.   |
| 768px                       | **pass**         | No sideways scroll on any page.   |
| 1280px                      | **pass**         | No sideways scroll on any page.   |

## Acceptance

| Item                                                                                                   | Result           |
| ------------------------------------------------------------------------------------------------------ | ---------------- |
| Lighthouse accessibility 95 or more, both pages, mobile                                                | **pass** (100)   |
| Every item above marked                                                                                | **pass**         |
| A teammate who hasn't seen the app finds a therapist and starts a call on their own phone without help | **open** (Tracy) |

## Tests added

`e2e/a11y.spec.ts`: the skip link is the first Tab stop, text follows the browser font size, search works with JavaScript off, and the call panel shows its JavaScript message. These run in CI.
