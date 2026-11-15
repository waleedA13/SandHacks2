# TheraCheck project record

A record of what was researched, decided and found for the SanD Hacks Fall 2026 project, as of Saturday 14 November 2026, about 6:45 PM. The project was first called Ghost Network Check and was renamed TheraCheck.

**How to read this.** "Verified" means a page was opened and read. "Search summary" means the fact came from a search result and the page was not opened. "Not verified" means it comes from general knowledge. No Bright Data product was run during research; anything the team has tested since is in the repo's `docs/smoke-test.md`, not here.

## 1. What we are building

A phone-friendly web app. The user picks an insurer and a California city and gets that insurer's therapist listings, re-ordered so the ones most likely to pick up and take new patients come first. Each listing has a label, a one-line reason and links to the pages that reason came from. A voice assistant can ask the office two questions for the user.

- **Bright Data** reads the insurer's directory and looks each therapist up elsewhere on the web.
- **Gemini** reads those pages and extracts facts.
- **ElevenLabs** is the voice assistant.
- **Neon** is the database.

It does not estimate prices or coverage, does not book appointments, has no accounts, and cannot prove a therapist is in network.

## 2. Hackathon facts (from the Fall 2026 hacker guide, verified)

- Hacking began Sat 10:30 AM. The hacking space closes Sat 9:00 PM and reopens Sun 7:00 AM.
- Initial submission Sun 11:00 AM. Final submission Sun 12:00 PM: 3-minute video, write-up, GitHub link, optional live link.
- **No commits before Sat 10:30 AM or after Sun 12:00 PM.** The guide says this means disqualification.
- Judging is science-fair style, Sun 12:30-2:30 PM: 3 minutes to present, 2 minutes of questions. The whole team must be at the table.
- Criteria: idea, demo, technical complexity, completion. Code quality is not judged.
- Tracks entered: Data for Good (Bright Data; $1,000 / $750 / $500), Best Project Built with ElevenLabs, Neon, Best Use of Gemini API (MLH), Best Overall.
- Bright Data track wording: "use web data to drive positive social impact". Every team gets $100 in credits.

## 3. How the idea was chosen

### Round 1: ten researched ideas
Five research threads (housing and courts, health, environment, labour and consumer, civic) produced ten ranked ideas. Full write-up: `reports/SanD Hacks Bright Data ideas.md`.

| Rank | Idea | Main weakness found |
|---|---|---|
| 1 | Excess Proceeds Finder (tax-sale surplus owed to former homeowners) | San Diego pages load without unblocking; only hundreds of users a year |
| 2 | Comment Clock (permit comment windows across 35 air districts) | Users are organizers, not the public |
| 3 | Funeral Price Radar | Depends on incumbents' coverage gaps, not checked |
| 4 | Landlord X-Ray SD | Three protected portals in series; riskiest demo |
| 5 | CareTeam Check (clinic staff vs licensing boards) | Wrong-person matches |
| 6 | Notice Near Me + Agenda Radar | Needs Bright Data only county-wide |
| 7 | Boil Notice | No California listing page found |
| 8 | Recall Resale Watch | Facebook Marketplace needs a login |
| 9 | Waitlist Watch | Free incumbent exists; big lists closed |
| 10 | South Bay Sewage Line | County already aggregates the data |

Rejected outright: eviction docket monitor (records sealed by statute, court bans scraping), drug shortages (open API exists), childcare inspections (free tool exists), assisted-living narratives (open API), charity-care agent, wage-theft check, rate-case radar, pantry hours, lead in school water, unclaimed property, forced-labour import lists, H-2A orders, pesticide notices.

### Round 2: wider audience, simpler build
The team found the ten too niche and too complex. Two further candidates were written up:

- **Rental listing duplicate checker** (`reports/Rental listing duplicate checker.md`): paste a listing, find the real original on other sites. FTC: nearly 65,000 reports and about $65M lost since 2020 (verified). Simpler scrape, but Facebook cannot be scraped.
- **Ghost Network Check** (`reports/Ghost Network Check.md`): the chosen idea.

Also considered and dropped: grocery price comparison (GroceryChop and PriceFetch exist), ghost-job checker (many checkers exist), job-scam checker (nothing public to scrape), disaster-aid deadline tracker (no evidence found), insurance rate-hike radar, transfer-credit checker, live ER wait board, cooling and warming centre finder.

### Why Ghost Network Check won
Documented harm, an audience of anyone using insurance to find a therapist, insurers have little reason to fix their own directories, and Bright Data, Gemini and ElevenLabs each do necessary work.

## 4. Evidence and what we may claim

| Claim | Source | Covers California? |
|---|---|---|
| Could book an appointment 18% of the time | Senate Finance Committee, May 2023: 120 calls, 12 Medicare Advantage plans, six states (verified) | Not established; only Oregon confirmed |
| 86% of listings were dead ends | New York Attorney General, Dec 2023 (search summary) | No |
| About 1 in 3 mental health listings wrong | American Journal of Managed Care, 2023, California regulator data for 2018-2019 (verified) | **Yes** |
| Regulators rarely fine insurers | ProPublica (search summary) | National |
| No patient-facing tool does this | One web search | Thinly supported |

**California figures (verified).** In 2018, 33.4% of psychiatrist listings and 30.5% of therapist-type listings were inaccurate; the therapist figure improved to about 19% in 2019. Among correctly listed psychiatrists, about half could offer an urgent appointment within 96 hours. The authors say California's rules are among the strongest in the country and "are still falling short".

**Weaker California points (search summaries).** A Los Angeles secret-shopper study: 15% of calls seeking a Medi-Cal psychiatric appointment got one. A California bill setting accuracy targets (AB 236) stalled in committee in August 2024.

**Pitch guidance.**
- Lead with the California figure. Use the Senate and New York results as national context only.
- Do not present 18% or 86% as California numbers; they measure "could you book", not "was the listing right".
- Say the California data is from 2018-2019.
- The strongest claim is our own: "Of the listings we checked this weekend, X looked like dead ends."
- Say "we found no patient-facing tool that does this", not "nobody does this".

## 5. Users, access and impact

**Personas.** Maya, 24, grad student on a phone. Robert, 67, retiree with low vision. Elena, 41, parent more comfortable in Spanish. Dana, 35, campus care navigator. The plan holds one user story per persona per feature: 40 stories across 10 features.

**Access across devices.** One mobile-first, server-rendered web page with no login; a voice route for people who cannot use the screen; plain language; WCAG AA contrast; works at 320px and at 200% text size.

**Impact, three numbers in order.** One person's story; our own sample from the scrape; then a clearly labelled extrapolation.

**Why use it if nothing is guaranteed.** The alternative is calling down the insurer's list in printed order, where about 1 in 3 listings is wrong. The app only has to be better than that list. This holds only if the ranking really is better than printed order, so hand-check 20 listings and report the agreement rate.

## 6. Scope decisions

- **Therapists only.** The evidence is about mental health, the problem is worst there, and therapists publish the details (insurers accepted, openings) that other specialists do not. The approach extends to other specialties, with weaker ranking.
- **California, one insurer, six cities.** San Diego (92101), Los Angeles (90012), San Francisco (94102), San Jose (95113), Sacramento (95814), Fresno (93721), about 30 listings each. San Diego first. ZIP codes are from memory and need checking.
- **Insurer.** The smoke test chose Cigna. The fixtures are Aetna.
- **No accounts, nothing saved about the user.** Searches live in the URL so results can be shared.
- **No real offices are called.** Every call goes to a teammate, and results are labelled as demo calls.

## 7. Stack and architecture

| Layer | Choice |
|---|---|
| Web app and API | Next.js on Vercel |
| Database | Neon Postgres |
| Directory scraping | Bright Data Browser API |
| Listing sites and practice sites | Bright Data Web Unlocker |
| Finding each therapist's site | Bright Data SERP API |
| Reading pages and ranking | Gemini, fast tier, structured output |
| Voice | ElevenLabs Agents (not ElevenCreative), Twilio for real phone calls |

**Arrangement for low coupling and low latency.** Four parts that talk only through the database: Collector, Verifier, Store, Front door. Nothing is scraped while a user waits; slow work goes through a jobs table. Each vendor is confined to one file. The web page and the voice agent use the same API.

**Budget.** Web Unlocker and SERP API about $1.50 per 1,000 requests; Browser API about $8 per GB. The project needs on the order of a thousand requests, so credits are not the constraint.

## 8. Features

| # | Feature | Priority |
|---|---|---|
| F1 | Ranked shortlist | P0 |
| F2 | Evidence and "last checked" | P0 |
| F3 | Call to confirm (voice agent) | P0 in browser, P2 by phone |
| F4 | Voice access (talk instead of using the screen) | P1 |
| F5 | Live re-check of one listing | P1 |
| F6 | Directory accuracy sentence | P0 |
| F7 | Fit filters: specialty, language, video sessions | P1 |
| F8 | Self-pay price, only where published | P1 |
| F9 | California licence check | P1 |
| F10 | Send me my shortlist, by share sheet, no account | P1 |

**Score.** Start at 50; still practising yes +20, no -30; lists insurer yes +15, no -25; taking new patients yes +15, no -25. Labels: 70 and above "Likely available", 40-69 "Unclear", below 40 "Likely dead end". A call result overrides to 100 or 0 and is labelled "Demo call".

**In-network answer.** Show how strong the evidence is: the directory lists them, their own site names the insurer, the office confirms. "2 of 3 sources agree."

**Ideas to extend beyond search (not built).**
- Call several offices for the user and report who has openings.
- "Nobody could take me" panel: how to ask the insurer to find a therapist and how to complain to the regulator, with a pre-filled complaint letter. The California rules it would cite are not verified.
- Fallback help: 988, the county access line, lower-cost options.
- "Was this right?" button so user reports improve the ranking.
- Public insurer scorecard.
- Call script and message draft per therapist.

## 9. Plan, team and repo

- **Repo:** `waleedA13/TheraCheck` (public; first named SandHacks2). Plan: `docs/superpowers/plans/2026-11-14-ghost-network-check.md`. Issue files: `docs/issues/`.
- **Team:** Waleed (Bright Data, collectors, database), Aditya `AdityaJadhav17` (API, verifier, voice), Tracy `Qinggin` (pages and accessibility).
- **GitHub issues #5 to #22** (file number plus 4). As of this record, closed: #5, #6, #9, #10, #11, #12, #13, #16, #17, #20. Open: #7 directory collector, #8 evidence collector, #14 accessibility, #15 live re-check, #18 Spanish, #19 demo and Devpost, #21 filters, fee, licence and share, #22 licence collector.
- **`CLAUDE.md` and `.env` are kept out of git** at Waleed's request. Commits carry no AI co-author line.

**Review of the plan: 13 findings.** Findings 1 to 5 were fixed and are on `main`:
1. A re-check wiped a call result. Now only the web score is stored and the final score is worked out when data is read.
2. Evidence could attach to the wrong therapist. Shared names now require a phone match.
3. Anyone could mark a therapist "Confirmed unavailable". Call results are now labelled as demo calls.
4. Aditya's order blocked Tracy. Now API, then voice agent, then verifier.
5. Nobody owned deploying. Now part of the scaffold issue.

Not fixed in the plan: 6 duplicate listings without a phone, 7 where the voice widget gets its result, 8 hand-copied listings in a public repo (the ignore rule was added), 9 placing the helper widget, 10 unused NPI lookup, 11 "last checked" showing the wrong day, 12 helper agent receiving the whole list, 13 open re-check route. The team may have handled some of these in code.

## 10. Live site outage

`https://theracheck.vercel.app` showed "We couldn't load the listings." Every data route returned a 500. The code from `main` worked against the database in the local keys, so the fault was in Vercel's settings: most likely the database address missing for Production, added without a redeploy, or pointing at an empty database. The settings could not be inspected from here. **When re-checked for this record the data route returned 200, so it has been fixed.** A Cigna search will still be empty until the directory scrape runs.

## 11. Call-and-connect feature

PDF version: `reports/Call and connect feasibility.pdf`.

### The idea
1. On first visit the user enters search details, a preferred date and time range, and a phone number.
2. The voice agent calls the office and asks whether they take new patients and are in network.
3. It asks for the earliest available date. The agent knows today's date.
4. If nothing fits the user's range, it gets the earliest date and texts the user to ask whether they want it.
5. If yes, it asks the office to wait, calls the user and merges the two calls.
6. Once both sides are talking, it stops speaking and only listens.

### Verdict
Possible. Every piece exists in ElevenLabs plus Twilio. Nothing here was tested.

| Step | Feasibility |
|---|---|
| Collect details, date range and phone number | Easy |
| Agent knows today's date | Easy: pass date and time zone in at call start |
| Ask about new patients, network and earliest date | Easy |
| Compare the offered date with the range | Easy |
| Text the user and wait for a yes | Hard: the office is on hold meanwhile |
| Call the user and merge the calls | Moderate: a conference call; needs testing |
| Agent goes silent and listens | Hard and risky |

### Pros
- Changes the product from search to getting an appointment.
- A strong demo with two teammates' phones.
- Uses ElevenLabs for something only a voice agent can do.

### Cons
- Most solo therapists do not answer live, so a live merge would often fail. It suits practices with a front desk.
- The user must be free at the moment the office answers, during office hours.
- A receptionist will hold for perhaps 30 to 60 seconds.
- It holds a phone number tied to someone seeking therapy, which breaks "nothing saved about you".

### Constraints (not verified, not legal advice)
- US rules restrict AI-voice calls to mobile phones without consent, and many therapists' office numbers are their own mobiles.
- California generally requires everyone's consent to record or monitor a private call.
- US carriers require business registration to send texts, which takes days.
- No real offices can be called this weekend.

### Recommended version
Drop the text and the listening. The agent asks its three questions; if the date fits, it says "please hold while I connect the patient" and calls the user at once; when the user answers it joins the calls and hangs up its own line. Answering the phone is the user's yes. If the date is outside the range, the app shows the earliest opening for the user to decide later.

### Solutions for consent and privacy

| Concern | Solution |
|---|---|
| AI voice calling a therapist who never agreed | Disclose in the first sentence, offer an opt-out, avoid mobile numbers |
| Agent listening to patient and office | The agent leaves when it connects them |
| Storing a phone number tied to therapy | Ask only when needed; delete when the call ends |
| Calling and texting the user | Explicit opt-in before any call or text |
| Transcripts of what the office said | Keep the answers, discard audio and transcript |

**The office's side.**
- Open with "This is an automated assistant calling for a patient" and say the call is being transcribed.
- Offer "say 'don't call again' and we won't", and keep a do-not-call list.
- Check whether a number is a landline or mobile; for mobiles, give the user a call script instead.
- Fallback with no AI voice: ring the user first, then dial the office and connect them.
- Longer term, let practices opt in or update availability through a link.

**The user's side.**
- Ask for the phone number only when they tap "call for me". Searching stays anonymous.
- A tick-box stating exactly what will happen. Texts need their own opt-in and "reply STOP".
- Delete the number when the call ends, or after 24 hours at most. Keep it out of logs and unlinked from searches.
- The agent says "a patient with Cigna", never a name or a reason.

**Listening and recording.**
- Do not listen after the merge. Ask the user afterwards with one tap: "Did you get an appointment?"
- Store only the result and turn off call recording.

**This weekend.** Every call goes to a teammate who has agreed, so consent is satisfied for the demo. Show the opt-in screen and the disclosure line on stage.

## 12. Honest limits to state in the pitch

- Web pages suggest; only the office confirms.
- The ranking has not been validated against real offices.
- The "dead end" count is an estimate from public pages, not a measurement, and is not comparable to the study's 1 in 3.
- Many listings may come back "Unclear" if therapists' sites say nothing about insurance or openings. Check this share after the first real scrape.
- The call on stage is staged.

## 13. Still open or not verified

- California rules on appointment time limits and plan obligations, needed for any complaint letter.
- The legal points in section 11.
- Site terms of use for the insurer directory and listing sites.
- Whether some plan types publish their directory as an open data feed, which would remove the need to scrape that half.
- Rules on automated calls to businesses.
- The six ZIP codes.
- Which review findings 6 to 13 the code already handles.
- The folder layout question between the original scaffold (`src/`, `tests/`) and the plan (`app/`, `lib/`, `collector/`, `verifier/`).

## Sources

- [Senate Finance Committee release, May 2023](https://www.finance.senate.gov/chairmans-news/wyden-calls-for-action-to-get-rid-of-ghost-networks-releases-secret-shopper-study) (verified)
- [Provider directory inaccuracy and timely access for mental health care, AJMC 2023](https://www.ajmc.com/view/provider-directory-inaccuracy-and-timely-access-for-mental-health-care) (verified)
- [FTC Data Spotlight on rental scams, Dec 2025](https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2025/12/rental-scams-hit-home-65-million-reported-losses) (verified)
- [New York Attorney General press release, Dec 2023](https://ag.ny.gov/index%2Ephp/press-release/2023/attorney-general-james-uncovers-major-problems-accessing-mental-health-care) (search summary)
- [ProPublica on regulators and ghost networks](https://www.propublica.org/article/ghost-networks-health-insurance-regulators) (search summary)
- [AB 236 status, CalMatters Digital Democracy](https://calmatters.digitaldemocracy.org/bills/ca_202320240ab236) (search summary)
- [Los Angeles Medi-Cal psychiatric secret-shopper coverage](https://www.aol.com/news/secret-shoppers-long-waits-scarce-150051827.html) (search summary)
- [CMS Provider Directory API FAQ](https://www.cms.gov/priorities/key-initiatives/burden-reduction/interoperability/frequently-asked-questions/provider-directory-api) (search summary)
