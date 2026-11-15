# MVP Definition

_Status: final for the SanD Hacks Fall 2026 submission._

## Problem statement

Insurer directories list therapists who moved, retired, left the plan or stopped taking new patients. A 2023 study of California regulator data found about 1 in 3 mental health listings wrong in 2018. People seeking care call down the list and reach dead numbers.

## Target users

See [personas.md](personas.md).

## Value proposition

TheraCheck re-orders an insurer's therapist directory so the listings most likely to answer and take new patients come first, and shows the evidence for each.

## In scope (shipped for the demo)

- [x] Search by insurer and California city, with results ranked by a score
- [x] A one-line reason, source links and "last checked" for each listing
- [x] Filters for specialty, language and video sessions; posted self-pay price; California licence status
- [x] A voice agent that asks an office whether it takes the plan and takes new patients
- [x] A live re-check of one listing
- [x] Share the top results without an account

## Out of scope (post-hackathon)

- Calls to real offices. During the hackathon the agent dials teammates only.
- User accounts and saved searches
- Insurers other than Cigna, and states other than California
- Price or coverage estimates
- Booking on the user's behalf

## Success criteria

| Criterion                     | How we measure it                                                 |
| ----------------------------- | ----------------------------------------------------------------- |
| Demo flow works end to end    | Search, open a listing, follow a source, run a voice confirmation |
| Works on a phone              | No sideways scrolling at 320px; Playwright runs at phone size     |
| Each ranking shows its reason | Every listing has a reason and at least a "last checked" date     |

## Known limits

- Web pages suggest and the office confirms. No one validated the ranking against real offices.
- Many listings read "Unclear" because therapists publish nothing about insurance or openings.

## Sponsor tracks

| Track                      | How the MVP qualifies                                                    |
| -------------------------- | ------------------------------------------------------------------------ |
| Bright Data, Data for Good | Scrapes the insurer directory and each therapist's own pages             |
| ElevenLabs                 | Voice agent asks the office and saves the answers                        |
| Gemini API                 | Reads evidence pages and returns structured facts                        |
| Neon                       | Stores listings, evidence, verdicts and calls; the parts talk through it |
