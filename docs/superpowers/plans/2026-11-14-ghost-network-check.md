# TheraCheck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement your issue task-by-task. Each issue in `docs/issues/` is one task with its own prompt.

**Goal:** A phone-friendly web app that takes an insurer and city, and returns that insurer's therapist listings ranked by how likely each is to be reachable and taking new patients, with a voice agent that confirms by asking the office.

**Architecture:** Four parts that talk only through one Postgres database. A Collector scrapes listings and evidence with Bright Data. A Verifier turns evidence into three facts and a score with Gemini. A Front door (Next.js pages and API) reads results. A Voice agent (ElevenLabs) uses the same API as the web page. Nothing is scraped while a user waits.

**Tech Stack:** Next.js (App Router, TypeScript) on Vercel, Neon Postgres, Bright Data (Browser API, Web Unlocker, SERP API), Gemini API (Flash tier, structured output), ElevenLabs Agents, Playwright, Vitest.

**Spec:** `docs/spec/ghost-network-check.md`

## Global Constraints

- **Deadlines (hacker guide):** hacking space closes Sat 9:00 PM, reopens Sun 7:00 AM. Initial submission Sun 11:00 AM. Final submission Sun 12:00 PM.
- **No commits after Sun 12:00 PM.** The guide says this means immediate disqualification. Feature freeze is Sun 9:30 AM.
- **Scope:** California, one insurer, therapists only. Six cities, about 30 listings each (about 180 in total): San Diego, Los Angeles, San Francisco, San Jose, Sacramento, Fresno. San Diego is scraped first and is the demo city. The other five are added only after San Diego works end to end.
- **Answer from the database.** No page or API route may call Bright Data or Gemini while a user waits. Slow work goes through the `jobs` table.
- **Never claim network status from web evidence.** Use the labels in "Score and labels" below. Call results are labelled as demo calls, because no real office is contacted during the hackathon.
- **No real offices are called.** The voice agent calls a teammate or runs in the browser. The agent always opens with: "This is an automated assistant calling for a patient."
- **Use the NPI Registry API, do not scrape it.**
- **Secrets live in `.env.local` only.** Never commit keys. `.env.example` lists the names.
- **Each vendor in one file:** `src/backend/collector/brightdata.ts`, `src/backend/verifier/gemini.ts`, `src/frontend/VoiceWidget.tsx`.
- **Only public professional information about therapists** is stored: name, credential, office address, office phone, public profile text.
- **Accessibility:** mobile-first single column, server-rendered, no login, WCAG AA contrast, real buttons and labelled inputs, works at 320px width.

## Personas

| ID  | Persona                             | Situation                                                                                  | Device and needs                                                                               |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| M   | **Maya, 24, grad student**          | First time looking for a therapist on her student plan; has already hit three dead numbers | Phone only, between classes, wants an answer in under a minute                                 |
| R   | **Robert, 67, retiree**             | Looking for a therapist after his wife's death; low vision, tires of phone trees           | Older Android phone with large text, or just a voice conversation                              |
| E   | **Elena, 41, parent**               | Finding care for her teenage son; more comfortable in Spanish                              | Phone, slow connection, wants plain language                                                   |
| D   | **Dana, 35, campus care navigator** | Helps dozens of students a month find in-network care                                      | Laptop, wants a list she can trust and share, and a number that shows how bad the directory is |

## Features and user stories

Priority: **P0** must ship, **P1** ship if on schedule at the Sat 9 PM checkpoint, **P2** stretch.

### F1. Ranked shortlist (P0)

Pick an insurer and city; get listings ordered by score.

- **US-F1-M:** As Maya, I want to pick my insurer and city and see the therapists most likely to answer first, so that my first call works.
- **US-F1-R:** As Robert, I want a short list in large text with a tap-to-call number, so that I do not have to read a long directory.
- **US-F1-E:** As Elena, I want the list in plain words with clear labels, so that I understand each result without medical or insurance jargon.
- **US-F1-D:** As Dana, I want the whole ranked list for a plan on one page, so that I can hand a student the top five.

### F2. Evidence and freshness (P0)

Each listing shows why it got its score, links to sources, and when it was last checked.

- **US-F2-M:** As Maya, I want one line saying why a listing is ranked low, so that I can skip it with confidence.
- **US-F2-R:** As Robert, I want the reason read out or shown in one large sentence, so that I do not need to open several pages.
- **US-F2-E:** As Elena, I want to see when a listing was last checked, so that I know whether to trust it today.
- **US-F2-D:** As Dana, I want links to the source pages behind each result, so that I can verify before recommending.

### F3. Call to confirm (P0 in browser, P2 as a real phone call)

A voice agent asks the office two questions: do you take this plan, and are you accepting new patients. The answer updates the ranking.

- **US-F3-M:** As Maya, I want the app to make the call for me, so that I do not spend my break on hold.
- **US-F3-R:** As Robert, I want someone else to ask the awkward questions, so that I only speak to offices that can take me.
- **US-F3-E:** As Elena, I want the call result shown in plain words, so that I know whether to phone them myself.
- **US-F3-D:** As Dana, I want confirmed results marked differently from web-based guesses, so that I know which are certain.

### F4. Voice access (P1)

Talk to an assistant instead of using the screen; it asks for insurer and city and reads the top matches.

- **US-F4-M:** As Maya, I want to ask out loud while walking, so that I do not have to type.
- **US-F4-R:** As Robert, I want to have a conversation and hear the top three with phone numbers, so that I do not need to read the screen.
- **US-F4-E:** As Elena, I want to ask in my own words, so that I do not need to know the right form fields.
- **US-F4-D:** As Dana, I want a voice option I can point students to, so that those who struggle with forms still get help.

### F5. Live re-check (P1)

Ask for a fresh check of one listing; the page updates when it finishes.

- **US-F5-M:** As Maya, I want to re-check the one therapist I like, so that I know today's status before calling.
- **US-F5-R:** As Robert, I want one large "check again" button that tells me when it is done, so that I am not left wondering.
- **US-F5-E:** As Elena, I want to see the old answer while the new one loads, so that a slow connection does not leave me with a blank page.
- **US-F5-D:** As Dana, I want to refresh stale listings before a student appointment, so that my advice is current.

### F6. Directory accuracy score (P0)

One number for the chosen insurer and city: how many listings look like dead ends.

- **US-F6-M:** As Maya, I want to know it is the directory that is broken and not me, so that I do not give up.
- **US-F6-R:** As Robert, I want a plain sentence like "12 of 40 listings look reachable", so that I know what to expect.
- **US-F6-E:** As Elena, I want that sentence in simple language, so that I understand the size of the problem.
- **US-F6-D:** As Dana, I want a figure I can quote to my department, so that I can argue for better coverage.

### F7. Fit filters (P1)

Narrow the list by what the therapist treats, the languages they speak, and whether they offer telehealth.

- **US-F7-M:** As Maya, I want to filter to therapists who treat anxiety and offer telehealth, so that I only see ones who fit my problem and schedule.
- **US-F7-R:** As Robert, I want to choose "grief" from a short list of plain words, so that I do not have to read every profile.
- **US-F7-E:** As Elena, I want to filter to Spanish-speaking therapists who see teenagers, so that my son and I can both talk to them.
- **US-F7-D:** As Dana, I want to combine filters and share the filtered link, so that each student gets a list that fits them.

### F8. Self-pay price (P1)

Show the session fee a therapist publishes, where they publish one.

- **US-F8-M:** As Maya, I want to see the posted fee, so that I know what I would pay if they turn out not to take my plan.
- **US-F8-R:** As Robert, I want the price in one plain line, so that I am not surprised on the phone.
- **US-F8-E:** As Elena, I want it clear that this is the therapist's own price and not what my insurance charges, so that I do not misread it.
- **US-F8-D:** As Dana, I want to see which listings publish no fee, so that I can warn students to ask.

### F9. Licence check (P1)

Show whether the California licensing board lists the therapist's licence as active.

- **US-F9-M:** As Maya, I want to see that a therapist's licence is active, so that I can trust someone I found online.
- **US-F9-R:** As Robert, I want a plain "Licence active" line, so that I do not need to look it up myself.
- **US-F9-E:** As Elena, I want to know the person seeing my son is licensed, in words I understand.
- **US-F9-D:** As Dana, I want a link to the board's own record, so that I can verify before recommending.

**As built (issue 18 / GitHub #22):** Bright Data refuses `search.dca.ca.gov` without KYC, and the search form has a Cloudflare check. Licence rows come from DCA's monthly public licensee files instead. Behavioral Sciences, Psychology and the nurse practitioner rows of Registered Nursing are used. Matches are made by licence number (from the NPI Registry or the Psychology Today profile) or by name, type and city or county. They give status but **no discipline history and no per-person record link**: `license_discipline` stays `unknown`, and the link is DCA's search page, with the licence number in the evidence text. Upgrade after the hackathon: the DCA Search API (iServices, access by request) for discipline and live status.

### F10. Send me my shortlist (P1)

Share the top three results by text, messaging app or link, with no account and nothing stored about the user.

- **US-F10-M:** As Maya, I want to text the top three to myself, so that I can call them after class.
- **US-F10-R:** As Robert, I want to send the list to my daughter, so that she can help me call.
- **US-F10-E:** As Elena, I want to share the list on WhatsApp with my husband, so that we can choose together.
- **US-F10-D:** As Dana, I want to copy a link or print the list, so that I can hand it to a student.

## Shared contract

Everything below is fixed by issue 01. Changing it needs a message to the whole team first.

### Tables (`src/backend/db/schema.sql`)

| Table      | Columns                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listings` | `id` uuid pk, `insurer` text, `plan` text, `city` text, `state` text, `name` text, `credential` text null, `address` text null, `phone` text null, `npi` text null, `source_url` text, `scraped_at` timestamptz                                                                                                                                                 |
| `evidence` | `id` uuid pk, `listing_id` uuid fk, `source` text (`psychology_today`, `practice_site`, `zocdoc`, `headway`, `license_board`), `url` text, `raw_text` text, `fetched_at` timestamptz                                                                                                                                                                            |
| `verdicts` | `listing_id` uuid pk fk, `still_practising` tri, `lists_insurer` tri, `accepting_new` tri, `score` int, `reason` text, `checked_at` timestamptz, `specialties` text[], `languages` text[], `telehealth` tri, `self_pay_min` int null, `self_pay_max` int null, `license_status` text (`active`, `inactive`, `not_found`, `unchecked`), `license_discipline` tri |
| `calls`    | `id` uuid pk, `listing_id` uuid fk, `status` text (`in_progress`, `done`, `failed`), `takes_plan` tri null, `accepting_new` tri null, `summary` text null, `called_at` timestamptz                                                                                                                                                                              |
| `jobs`     | `id` uuid pk, `listing_id` uuid fk, `kind` text (`recheck`), `status` text (`queued`, `running`, `done`, `failed`), `created_at` timestamptz, `finished_at` timestamptz null                                                                                                                                                                                    |

`tri` is text limited to `yes`, `no`, `unknown`.

### Types (`src/shared/types.ts`)

`Tri`, `Listing`, `Evidence`, `Verdict`, `Call`, `Job` mirror the tables in camelCase. `ListingSummary` is `{ id, name, credential, address, phone, score, label, reason, checkedAt, specialties, languages, telehealth, selfPayMin, selfPayMax, licenseStatus, call: { takesPlan, acceptingNew, summary, calledAt } | null }`.

### API (Next.js routes)

| Route                              | Returns                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/listings?insurer=&city=` | `ListingSummary[]`, highest score first. Optional filters: `specialty=`, `language=`, `telehealth=yes`                                                 |
| `GET /api/listings/[id]`           | `{ listing, verdict, evidence[], calls[] }`                                                                                                            |
| `GET /api/stats?insurer=&city=`    | `{ total, likelyAvailable, unclear, likelyDeadEnd, deadEndPct }`                                                                                       |
| `POST /api/listings/[id]/recheck`  | `{ jobId }`; inserts a `queued` job                                                                                                                    |
| `GET /api/jobs/[id]`               | `{ status }`                                                                                                                                           |
| `POST /api/calls/result`           | body `{ listingId, takesPlan, acceptingNew, summary }`; inserts a `done` call and changes nothing else; returns the listing's final `{ score, label }` |

### Score and labels (`src/shared/score.ts`)

`scoreVerdict(v: { stillPractising: Tri; listsInsurer: Tri; acceptingNew: Tri }, call?: { takesPlan: Tri; acceptingNew: Tri }): { score: number; label: Label }`

- Start at 50. `stillPractising`: yes +20, no -30. `listsInsurer`: yes +15, no -25. `acceptingNew`: yes +15, no -25. `unknown` adds 0. Clamp to 0-100.
- A call overrides web evidence: both `yes` gives 100; either `no` gives 0; otherwise keep the web score.
- Labels: 70 and above `Likely available`; 40-69 `Unclear`; below 40 `Likely dead end`. With a call: `Demo call: available` (100) or `Demo call: unavailable` (0).
- **Where scores live.** `verdicts.score` holds the web-evidence score only. The final score and label are worked out each time data is read, as `scoreVerdict(verdict, latestDoneCall)`. Nothing writes a call-based score into `verdicts`, so a re-check cannot erase a call result.
- **Stats buckets** use the final score: 70 and above `likelyAvailable`, 40-69 `unclear`, below 40 `likelyDeadEnd`.
- **Every call is a demo call.** The person answering is a teammate, not the office, so the page always shows "Demo call. No real office was contacted." beside a call result.

### Environment (`.env.example`)

`DATABASE_URL`, `BRIGHTDATA_API_TOKEN`, `BRIGHTDATA_UNLOCKER_ZONE`, `BRIGHTDATA_SERP_ZONE`, `BRIGHTDATA_BROWSER_WSS`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `NEXT_ELEVENLABS_AGENT_ID` (server-only), `CALLS_WEBHOOK_SECRET`.

## File structure and owners

| Path                                                                                                         | Responsibility                                    | Owner                       |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------- |
| `src/backend/db/schema.sql`, `src/backend/db/seed.sql`                                                       | Tables and 12 fixture listings with verdicts      | Waleed                      |
| `src/backend/db/client.ts`, `src/shared/types.ts`, `src/shared/score.ts`, `src/shared/score.test.ts`         | Database client, shared types, scoring            | Waleed (01), then shared    |
| `src/backend/collector/brightdata.ts`                                                                        | The only file that calls Bright Data              | Waleed                      |
| `src/backend/collector/directory.ts`, `src/backend/collector/evidence.ts`, `src/backend/collector/worker.ts` | Scrape listings, scrape evidence, run queued jobs | Waleed                      |
| `src/backend/verifier/gemini.ts`, `src/backend/verifier/verify.ts`                                           | Evidence to three facts, score and reason         | Aditya                      |
| `src/app/api/**`                                                                                             | The six routes above                              | Aditya                      |
| `voice/agent-confirm.md`, `voice/agent-helper.md`, `voice/README.md`                                         | Agent prompts and setup notes                     | Aditya                      |
| `src/frontend/VoiceWidget.tsx`                                                                               | The only file that loads the ElevenLabs client    | Aditya builds, Tracy places |
| `src/app/page.tsx`, `src/app/listing/[id]/page.tsx`, `src/frontend/**`, `src/app/globals.css`                | Pages and UI                                      | Tracy                       |
| `docs/demo-script.md`                                                                                        | 3-minute pitch and video shot list                | All                         |

Stay inside your own paths. If you need a change elsewhere, ask the owner.

## Issues

| #   | Issue                                              | Owner         | Priority | Stories           | Depends on     | Time box |
| --- | -------------------------------------------------- | ------------- | -------- | ----------------- | -------------- | -------- |
| 01  | Scaffold, database contract and fixtures           | Waleed        | P0       | all               | none           | 45 min   |
| 02  | Bright Data smoke test and insurer choice          | Waleed        | P0       | F1                | 01             | 75 min   |
| 03  | Directory collector                                | Waleed        | P0       | F1, F6            | 02             | 2 h      |
| 04  | Evidence collector                                 | Waleed        | P0       | F2                | 02             | 2 h      |
| 05  | Verifier with Gemini                               | Aditya        | P0       | F1, F2            | 01             | 2 h      |
| 06  | Read and write API routes                          | Aditya        | P0       | F1, F2, F3, F6    | 01             | 1.5 h    |
| 07  | Confirm-call voice agent in the browser            | Aditya        | P0       | F3                | 06             | 2 h      |
| 08  | Search and ranked results page                     | Tracy         | P0       | F1, F6            | 01             | 2.5 h    |
| 09  | Listing detail with evidence and call panel        | Tracy         | P0       | F2, F3            | 08, 07         | 2 h      |
| 10  | Accessibility and device pass                      | Tracy         | P0       | F1-F6 for R and E | 08, 09         | 1.5 h    |
| 11  | Live re-check                                      | Waleed, Tracy | P1       | F5                | 03, 04, 05, 09 | 1.5 h    |
| 12  | Patient helper voice agent                         | Aditya        | P1       | F4                | 06, 07         | 1.5 h    |
| 13  | Real phone call through Twilio                     | Aditya        | P2       | F3                | 07             | 1.5 h    |
| 14  | Spanish page text and voice                        | Tracy, Aditya | P2       | all for E         | 10             | 1 h      |
| 15  | Demo data, pitch, video and Devpost                | All           | P0       | none              | all P0         | 2 h      |
| 16  | Fit, fee and licence facts in the verifier and API | Aditya        | P1       | F7, F8, F9        | 05, 06         | 1 h      |
| 17  | Filters, fee, licence and share on the pages       | Tracy         | P1       | F7, F8, F9, F10   | 08, 09, 16     | 2 h      |
| 18  | Licence evidence collector                         | Waleed        | P1       | F9                | 02, 04         | 1.5 h    |

The columns for issues 16-18 are in the contract from the start, so issue 01 creates them and nobody changes the schema later. Until 16 and 18 run, those columns are empty and the pages hide the matching lines.

**Fixed vocabularies.** Specialties: `anxiety`, `depression`, `trauma`, `grief`, `teens`, `children`, `couples`, `addiction`, `adhd`. Languages: stored as lower-case English names, such as `spanish`.

Issues 05, 06 and 08 start from the fixtures in issue 01, so nobody waits for real scrapes.

**Aditya's order is 06, then 07, then 05.** Tracy's pages and the voice agent both wait on 06. The verifier (05) runs on fixtures and only has to be finished before real evidence arrives in the evening.

## Schedule

| When                       | Checkpoint                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Sat 2:00-2:45 PM           | Issue 01 merged. Everyone has accounts, keys and the app running locally.                                            |
| Sat 4:00 PM                | Issue 02 decided: which insurer directory works. If none does, see the fallback in issue 02.                         |
| Sat 6:00 PM                | Vertical slice on fixtures: results page reads the API; the agent holds the two-question conversation in a browser.  |
| Sat 9:00 PM (space closes) | Real listings, evidence and verdicts in Neon. Call result changes a ranking on screen. Decide which P1 issues to do. |
| Sun 7:00-9:30 AM           | P1 work, accessibility pass, final demo data scrape. **Feature freeze 9:30 AM.**                                     |
| Sun 9:30-11:00 AM          | Record the 3-minute video, write the Devpost answers. Initial submission by 11:00.                                   |
| Sun 12:00 PM               | Final submission. Last commit before this.                                                                           |

## Review Focus

1. **Two therapists with the same name.** Evidence for one must not be attached to the other. Match on name plus phone or address; when unsure, store nothing. When two listings share a name, only a phone match counts. Test in issue 04.
2. **A listing with no evidence at all.** It must score 50 and read "Unclear", not crash or show as a dead end. Test in issue 05.
3. **A caller's answer that is vague** ("call back Monday"). The agent must record `unknown`, not guess. Checked in issue 07.
4. **Empty search result** (insurer and city with no listings). The page must say so and suggest the demo city. Checked in issue 08.
5. **Slow or failed re-check.** The old answer stays visible and the page says the check failed. Checked in issue 11.

## Self-review notes

- Every feature F1-F6 has an owning issue; every P0 story maps to issues 03-10.
- Names used across issues match the contract: `scoreVerdict`, `ListingSummary`, the six routes and five tables.
- Not covered by any issue, by choice: user accounts, saving favourites, more than one city, booking.
