# 28 "Pay yourself" results, cost help and the plan we checked (GitHub #52)

**Owner:** Tracy (Qinggin) · **Priority:** P1 · **Time box:** 1.5 h · **Depends on:** #45, #47, #48 (build on the seed fixtures)

## Why

Three decisions from the planning round (`docs/superpowers/specs/2026-11-14-theracheck-direction-notes.md`):

1. **TheraCheck is for everyone, insurance-first.** A therapist who no longer takes the plan but sees self-pay clients now gets the label **Pay yourself** (#47). The results page needs a place for them that is not the dead-end pile.
2. **No personal cost estimates.** We cannot know anyone's deductible or out-of-network allowance, and a wrong number causes harm. Instead the detail page explains costs in general and gives the user the questions to ask.
3. **Networks are per plan, not per insurer.** Most people do not know their plan name, but it is printed on their insurance card. The page says which network we checked and where to find theirs.

## Before and after

|                          | Before                     | After                                                                                                       |
| ------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Self-pay therapists      | In "Likely dead end"       | Their own section, "If you can pay yourself", above the dead ends                                           |
| Plan                     | Not shown                  | Under the search: "Checked against Cigna Open Access Plus"                                                  |
| Plan hint                | None                       | "Your plan name is on your insurance card. If it says something else, these results may not apply."         |
| Costs on the detail page | Posted self-pay price only | Price (if posted), a short explainer, three questions to ask the insurer, and the Good Faith Estimate right |
| Evidence strength        | Not shown                  | "Checked in {sourceCount} places" next to the reason                                                        |

## What to build

**1. Results page (`src/app/page.tsx`).**

- A section "If you can pay yourself" for listings labelled `Pay yourself`, between "Also worth a try" and "Likely dead end". One sentence under the heading: "These therapists don't seem to take {insurer} now, but they see clients who pay for themselves."
- Under the search form or in the summary: "Checked against {insurer} {plan}" and the card hint above. Read `plan` from the listings (all listings in one search share it; if they differ, show the most common).

**2. Card (`src/frontend/ListingCard.tsx`).** "Checked in {sourceCount} places" in small text under the reason. For `Pay yourself` listings, show the posted price line if there is one.

**3. Detail page cost help (`src/app/listing/[id]/page.tsx`).** A panel "What it might cost", always shown:

- The posted self-pay price, if any (already extracted), worded "Their posted price: $150 a session".
- "With {insurer}: if they're in your network, you usually pay a copay or part of the fee after your deductible. If they're not, you may pay the full fee and claim some back."
- "Ask {insurer} (the number is on your card):" then three bullets: "Is {name} in network for my plan?", "What's my copay for therapy?", "How much of my deductible is left?"
- "Paying yourself? You have the right to a written Good Faith Estimate of the cost before your first session."

No numbers we did not find on the therapist's own pages.

## Files

- Modify: `src/app/page.tsx`, `src/frontend/ListingCard.tsx`, `src/app/listing/[id]/page.tsx`, `src/app/globals.css`, `e2e/` (new spec)
- Create: `src/frontend/CostHelp.tsx`

## Interfaces

- **Consumes:** `Pay yourself` label (#47), `plan`, `sourceCount`, `seesSelfPay`, `selfPayMin`, `selfPayMax` (#45, #48).

## Acceptance check

- With the seed data, the `Pay yourself` fixture appears in "If you can pay yourself", not in "Likely dead end".
- The plan line shows the seed plan name; the hint is present.
- The detail page shows the cost panel for every listing, the price only where one is posted, and no other dollar amounts.
- At 320px wide nothing scrolls sideways; headings are in order; the page reads well at 200% text size.
- An e2e spec covers the section and the cost panel. Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md (Next.js 16: read the guides in node_modules/next/dist/docs/ first), docs/issues/28-pay-yourself-cost-help.md, docs/issues/21-contract-booking-lines-selfpay.md, docs/issues/23-verifier-score-selfpay.md, docs/issues/24-api-booking-report-mobile-guard.md and the direction notes.
Read src/app/page.tsx, src/frontend/ListingCard.tsx and src/app/listing/[id]/page.tsx as they are now.

Write the e2e spec first and see it fail. Then add the section, the plan line and hint, the source count, and CostHelp as the issue describes.
Use the frontend-design skill for the look and the stop-slop skill for every line of copy. Never show a dollar amount that did not come from the therapist's own pages.
Check 320px, 390px and 1280px widths, 200% text size, keyboard-only and JavaScript disabled, and show me screenshots.
Never read .env.local or run db:reset. Commit with plain conventional commits, no co-author trailer. Do not push.
```
