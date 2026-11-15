# TheraCheck direction notes (planning conversation, Sat 14 Nov 2026, evening)

Working notes from the planning conversation after the project record (`reports/TheraCheck project record.md`). Not yet a design; decisions marked **agreed** were confirmed by Aditya.

## Background facts discussed (general knowledge, not verified this session)

- Insurers do not book therapy. You find an in-network therapist, contact the office (or book on a platform such as Zocdoc, Headway, Alma, Rula), and confirm.
- Every insurer must publish a provider directory, but mental health is often run by a separate company with its own directory: UnitedHealthcare uses Optum, Cigna uses Evernorth, Aetna runs its own, Anthem often uses Carelon; Blue Shield moved behavioral health to a separate unit on 1 Jan 2026 (from `docs/smoke-test.md`).
- Networks are per plan, not per insurer. The smoke test scraped **Cigna Open Access Plus**.
- Therapists are commonly in several insurers' networks, and platforms like Headway and Alma contract with many insurers at once. Treat them as one person (NPI or phone).
- Many therapists are self-pay only. Self-pay patients can ask for a written Good Faith Estimate. Out-of-network PPO members can claim part back with a superbill.
- Nearly every plan covers therapy (California SB 855; federal ACA and parity rules). The real question for a user is whether a therapist is in their plan's network.

## Decisions

1. **For everyone, insurance-first (agreed).** One list from the insurer's directory; each listing says honestly whether you can use insurance or would pay yourself. The pitch stays about wrong insurance directories.
2. **Show the network we checked, not a list of plans that cover therapy (agreed).** "Checked against Cigna Open Access Plus", plus "Your plan name is on your insurance card. If it says something else, these results may not apply."
3. **No personal out-of-pocket estimates (agreed).** We cannot know a person's deductible, coinsurance or out-of-network allowed amount, and a wrong number causes harm. The record already rules out estimating prices or coverage.
4. **New label "Pay yourself" (agreed).** A therapist whose own site says they do not take this insurance but sees self-pay clients is not a dead end. Needs a new verifier fact (sees self-pay clients: yes, no, unknown) and a new label in the score and the pages.
5. **Cost help on the detail page (agreed):** posted self-pay price (already built), a short in-network vs out-of-network explainer, three questions to ask the insurer, and the Good Faith Estimate right.

## Known limit

Self-pay-only therapists are usually not in insurer directories, so tonight we only show self-pay options among listed therapists. Covering them properly needs a second source (for example Psychology Today), not planned for this weekend.

## Open: feedback from former hackathon winners

- "It feels like a search engine; more can be done."
- Scraped data must be as accurate as possible because it is our source of truth.
- How is this better than booking through the insurer's website?
- Is calling the only way to book? What about booking online?

## Answers to the feedback (proposed, discussed)

- **Accuracy:** 100% is not reachable from public pages; the insurer directory is the claim we test, not our source of truth. Raise confidence with several agreeing sources, identity by NPI or phone, a date on every fact, and a measured agreement rate from hand-checking 20 listings, quoted on stage.
- **Better than the insurer's website:** the order to call in, the reason and the evidence, instead of a printed list that is about 1 in 3 wrong. Only true if the measured rate backs it.
- **Booking online:** many therapists take online bookings (Zocdoc, Headway, Alma, Rula, or SimplePractice/TherapyNotes/Jane widgets and request forms on their own sites). Proposed: detect booking links during evidence collection and show a "Book online" button; an open slot on a booking page is the strongest public sign of taking new patients. Link to public booking pages rather than reading calendars (terms of use not read).

## Voice agents and the law (researched, not legal advice)

- FCC declaratory ruling, Feb 2024: AI-generated voices count as "artificial" voices under the TCPA. Artificial-voice calls to mobile numbers need the called party's prior express consent (written consent for telemarketing), and must identify the caller. Business landlines were not clearly addressed in the sources found; check 47 C.F.R. § 64.1200.
- California AB 2905 (effective 1 Jan 2025): calls using an AI-generated voice must say so.
- California Penal Code § 632/632.7: recording a confidential call needs every party's consent, and current lawsuits (SoundHound, ConverseNow) argue AI transcription counts.
- Consequences: the agent's first line must say it is an AI voice from TheraCheck and that the call is transcribed; no audio stored for calls to real offices; only call numbers known to be business landlines, never mobiles, without consent; the agent must leave before patient and office talk; no texts (A2P registration takes days).

## Booking flow (agreed)

1. **Online booking available:** "Book online" links to the therapist's booking page. An open slot is evidence of taking new patients.
2. **No online booking, office number is a landline:** the AI agent asks the two questions (AI-voice and transcription disclosure first, no audio stored). If both answers are yes it offers to connect: it rings the user, joins the calls and drops off before they talk. The answers update the listing for everyone.
3. **No online booking, office number is a mobile:** no AI call without consent. Show tap-to-call with a script, then one tap afterwards: "Did they answer? Are they taking patients?" The user's answer updates the listing.

Line type comes from a lookup (for example Twilio Lookup) done once at collection time. A user-made call alone was rejected as the main path because it loses the check before the user spends a call.

**Demo:** three listings on stage, one per path.

## Constraint

Submission Sun 12:00 PM. The Cigna data (issues #7 and #8) is the critical path for everything else.
