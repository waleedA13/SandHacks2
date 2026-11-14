# 10 Accessibility and device pass

**Owner:** Tracy · **Priority:** P0 · **Time box:** 1.5 h · **Depends on:** 08, 09

## User stories
Every feature must work for the two personas most likely to be shut out:
- **Robert (low vision, older phone):** US-F1-R, US-F2-R, US-F3-R, US-F6-R.
- **Elena (slow connection, plain language):** US-F1-E, US-F2-E, US-F3-E, US-F6-E.

## What to check and fix
Go through both pages as each persona and fix what fails.

**As Robert**
- Set the phone's or browser's text size to 200%. Nothing overlaps or is cut off.
- Turn on VoiceOver or TalkBack. Search, open a listing, start and stop the call using the screen reader only.
- Use only the keyboard on a laptop. Focus is always visible and follows reading order.
- Every colour pair meets WCAG AA contrast. No meaning is carried by colour alone.

**As Elena**
- Throttle the browser to "Slow 4G". The results page shows content in under 3 seconds.
- Read every sentence on both pages. Replace insurance and tech jargon with plain words; aim for a reading level a 12-year-old could follow.
- Turn JavaScript off. Search and the listing page still work; only the call panel needs JavaScript, and it says so.

**Devices and browsers**
- A real iPhone (Safari) and a real Android phone (Chrome).
- Desktop Chrome, Safari and Firefox.
- Widths 320px, 390px, 768px, 1280px.

## Files
- Modify: `app/globals.css`, files under `components/`, `app/page.tsx`, `app/listing/[id]/page.tsx`
- Create: `docs/accessibility-check.md` (what was tested, what passed, what was fixed, what is still open)

## Interfaces
- **Consumes:** the pages from issues 08 and 09.
- **Produces:** `docs/accessibility-check.md`, quoted in the Devpost write-up.

## Acceptance check
- Lighthouse accessibility score of 95 or more on both pages, mobile setting.
- Every item in the three lists above is marked pass, fixed, or open with a reason in `docs/accessibility-check.md`.
- A teammate who has not seen the app completes "find a therapist and start a confirm call" on their own phone without help.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Personas" and "Global Constraints", and docs/issues/10-accessibility-device-pass.md.

Run the app and audit both pages against the three checklists in the issue. Use the browser's Lighthouse accessibility audit on the mobile setting and list every failure.
Fix the failures in the components and CSS: contrast, focus styles, heading order, labels, aria-live for the call status and badge change, text scaling to 200%, tap targets of at least 44px.
Rewrite any on-screen sentence that uses jargon into plain words, and show me each before and after so I can approve the wording.
Test at 320, 390, 768 and 1280px and with JavaScript disabled.
Write docs/accessibility-check.md recording each item as pass, fixed or open. Be honest about what you could not test (real devices and real screen readers are mine to test).
Do not change the API, collector/ or verifier/. Do not commit; show me the diff and a proposed commit message.
```
