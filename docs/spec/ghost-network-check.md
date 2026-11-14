# TheraCheck: which therapists in your insurer's directory are real

Planning and market research only: no code, no schemas. Researched 2026-11-14.

**How to read the labels.** VERIFIED means the page was opened and read on the research date. SEARCH means the fact comes from a search-result summary and the page was not opened. LOADED means a plain request returned the page normally. JS SHELL means it returned only an empty app frame that needs a real browser. BLOCKED means the request was refused. Build hours are estimates; nothing was built and no Bright Data product was run.

## 1. Project Title & Track Hierarchy

- **Project:** TheraCheck
- **Scope:** national problem; demo on one insurer in one city.
- **Main Track:** Bright Data ("Data for Good")
- **Stacked Tracks:** Gemini API (read each therapist's own website and judge whether they take that plan and new patients), ElevenLabs (voice agent that phones an office to confirm). Neon is optional, as a store of checked listings; add it only if it appears in the demo.

## 2. The Unsolved Social Impact Problem

A person with insurance looks for a therapist in their insurer's directory, then phones listing after listing and finds wrong numbers, providers who left the network, and practices that are full. Many give up or pay out of pocket.

- **Senate study, 2023:** committee staff called 120 mental health listings across 12 Medicare Advantage plans in six states. They could book an appointment 18% of the time; 33% of listings were inaccurate, non-working numbers or unreturned calls. In Oregon they could not book a single appointment.
- **New York Attorney General, December 2023:** staff called about 400 listed providers across 13 plans and found 86% were unreachable, out of network or not taking new patients. Only 56 of 396 offered an appointment. (SEARCH)
- **Older studies cited by the Senate release:** appointments obtained 17% of the time in a 2017 study of commercial plans and 26% in a 2015 study.
- **Enforcement is weak:** ProPublica reported that regulators issue fewer than a dozen fines for directory errors in an average year, and Arizona has fined one plan, $7,500, since 2016. A 2025 lawsuit blames an insurer's ghost network for a man's death after he could not find care. (SEARCH)
- **Why it is unsolved:** the insurer's list and the truth about each therapist sit in different places. The truth is on the therapist's own website, on listing sites, and at the end of a phone line.

## 3. Why It's Not Just a Feature

- **Insurers have little reason to fix it.** A long directory looks like a strong network to regulators and buyers, and fines are rare.
- **Marketplaces only vouch for their own providers.** Zocdoc, Headway and similar sites verify the clinicians who sign up with them. None audits an insurer's directory.
- **The check needs data from many unrelated sites.** Confirming one listing means reading the insurer's directory, the therapist's practice site and several listing sites, then reconciling names, addresses and phone numbers. That is an aggregation problem, not a filter.

## 4. The Bright Data Pipeline (And Supporting Stack)

**Bright Data (The Engine)**

The user picks an insurer, plan and city. The pipeline pulls that directory's therapists, then checks each one against other public sources and ranks the list by how likely each is to be reachable and taking patients.

| Source | What a plain request returned | Bright Data product |
|---|---|---|
| Aetna, Anthem directories | JS SHELL, with Akamai bot protection | Browser API |
| Cigna, Blue Shield of California directories | JS SHELL | Browser API |
| Kaiser doctor search | Redirect, with Akamai | Browser API |
| Psychology Today therapist listings, including by-insurer pages | LOADED | Web Unlocker, only for volume |
| Zocdoc therapists | BLOCKED (403) | Web Unlocker |
| Headway, GoodTherapy | BLOCKED (403, Cloudflare challenge) | Web Unlocker |
| Each therapist's own practice website | Not tested | SERP API to find it, Web Unlocker to read it |
| NPI Registry (federal provider ID lookup) | LOADED; free public API | None. Use the API, do not scrape |

Every insurer directory probed needs a real browser, and three of the four independent listing sites refused a plain request. That is where Bright Data is load-bearing.

**Supporting Tracks (The Enablers)**

- **Gemini:** reads each practice website and listing and extracts three facts: does this person still practise here, do they list this insurer, and are they taking new patients. It then writes a one-line reason for each ranking.
- **ElevenLabs:** a voice agent phones an office and asks two questions: do you take this plan, and are you accepting new patients. This turns a web-based likelihood into a confirmed answer.
- **Neon (optional):** stores each checked listing with the date, so the directory's accuracy rate can be shown as a number.

## 5. Data Availability & Feasibility Audit

**Pros**

- Wide audience: anyone using insurance to find mental health care.
- Harm is documented by a Senate committee and a state attorney general, with lawsuits and a death in the news.
- Clear impact number from your own data: "of 50 listings we checked, X% were dead ends".
- Bright Data, Gemini and ElevenLabs each do necessary work.
- Reconciling people across sites gives real technical depth.

**Cons & Bottlenecks**

- **Web evidence cannot prove network status.** Only the office or the insurer can. The honest product is a ranked shortlist that puts likely-real listings first, plus confirmed answers for the few that were phoned.
- **Phoning real offices needs care.** The hackathon falls on a weekend when offices are closed, and automated calls to clinicians need to identify themselves. For the demo, call a team member's phone or one practice that has agreed.
- **Insurer directories are the hardest scrape here.** They are multi-step search forms inside JavaScript apps behind Akamai. Test one insurer in hour one and commit to it.
- **Public directory feeds may exist for some plans.** Federal rules require certain plans to publish their directories through a public data feed with no login. A search summary names Medicaid managed care, CHIP and marketplace plans; whether Medicare Advantage is included was not confirmed. An industry brief reports only 64% of payers offer the feed and most still demand a login. If your chosen plan has a working feed, the directory half needs no scraping, and Bright Data's role shrinks to the verification half. Pick an employer or commercial plan for the demo to avoid this.
- **Name matching:** two therapists with the same name must not be merged. Match on name plus address or phone, and show the sources.
- **Terms of use were not read** for any site.

**100% Public Web Data vs. Hands-On/Proprietary Data**

Verdict: the ranking is achievable today with public web data only. Insurer directories are public without a login, and listing sites and practice websites are public. The confirmation step is hands-on: a phone call, not web data. No member login, health records or private data are needed.

**Estimated Build Time Breakdown**

Scraper setup: 5 hrs | Backend/DB: 2.5 hrs | AI/Voice logic: 3.5 hrs | Frontend/Demo UI: 3 hrs = **14 hours**

Cutting the voice agent brings it to about 12 hours and leaves a web-only ranking.

## 6. Verifiable Market Research & Links

**Evidence the problem exists**

- [Senate Finance Committee release, May 3, 2023](https://www.finance.senate.gov/chairmans-news/wyden-calls-for-action-to-get-rid-of-ghost-networks-releases-secret-shopper-study) — VERIFIED. Source for the 18%, 33%, Oregon, 2017 and 2015 figures.
- [Senate secret shopper study report (PDF)](https://www.finance.senate.gov/imo/media/doc/050323%20Ghost%20Network%20Hearing%20-%20Secret%20Shopper%20Study%20Report.pdf) — SEARCH.
- [New York Attorney General press release, December 2023](https://ag.ny.gov/index%2Ephp/press-release/2023/attorney-general-james-uncovers-major-problems-accessing-mental-health-care) and [report PDF](https://ag.ny.gov/sites/default/files/reports/mental-health-report_0.pdf) — SEARCH.
- [ProPublica: regulators and ghost networks](https://www.propublica.org/article/ghost-networks-health-insurance-regulators) — SEARCH.
- [ProPublica: Centene ghost network lawsuit](https://www.propublica.org/article/centene-ghost-network-lawsuit-ambetter-ravi-coutinho) — SEARCH.
- [NPR guide: what to do about a ghost network](https://www.npr.org/sections/shots-health-news/2024/09/20/nx-s1-5118420/mental-health-insurance-guide-ghost-network) — SEARCH. The current workaround is manual: keep calling, then complain to the insurer and regulator.
- [CMS Provider Directory API FAQ](https://www.cms.gov/priorities/key-initiatives/burden-reduction/interoperability/frequently-asked-questions/provider-directory-api) — SEARCH. Source for the public data feed caveat.

**Closest existing tools and their blind spots**

| Tool | What it does | Blind spot |
|---|---|---|
| [Zocdoc](https://www.zocdoc.com/therapists) — BLOCKED to scripts | Verifies and books providers who join its platform (per search summary) | Covers only its own providers; does not audit an insurer's directory |
| [Headway](https://headway.co/therapists/california/san-diego) — BLOCKED to scripts | Marketplace of therapists it has contracted with insurers | Same; only its own network |
| [Psychology Today](https://www.psychologytoday.com/us/therapists/aetna/ca/san-diego) — LOADED | Therapist-written profiles, filterable by insurer | Self-reported and not checked against the insurer |
| Insurer directories | The official list | The source of the problem |
| Manual workaround | Phone each listing | Senate staff succeeded 18% of the time |

One search for a patient-facing tool that checks an insurer's directory against other sources found none.

**Target Data Source URLs**

- [Psychology Today, Aetna therapists in San Diego](https://www.psychologytoday.com/us/therapists/aetna/ca/san-diego) — LOADED with a plain request. Start here to inspect profile structure.
- [Aetna provider search](https://www.aetna.com/dsepublic/#/contentPage?page=providerSearchLanding) — JS SHELL from a script; open it in a browser and run a search as a guest to see the result pages.
- [NPI Registry API example](https://npiregistry.cms.hhs.gov/api/?version=2.1&taxonomy_description=psychologist&city=san%20diego&state=CA&limit=2) — LOADED. Free federal lookup for matching names to addresses.

## What was not checked

- No Bright Data product was run, so getting through the insurer directories is expected, not shown.
- No directory search was actually submitted; only landing pages were probed.
- Most evidence links other than the Senate release came from search summaries and were not opened.
- "No patient-facing checker exists" rests on a single search.
- Whether therapist practice websites state insurance and availability often enough to rank on was not tested.
- Rules on automated calls to businesses were not researched.

## 7. Demo Plan and Final Pick

**Calling plan for the demo.** Offices are closed on the weekend, so the ElevenLabs agent calls a team member's phone instead of a real provider. Say on stage that the call is staged; the point is to show the agent asks the right questions and acts on the answers.

- **The agent identifies itself first:** "This is an automated assistant calling for a patient."
- **The teammate plays the receptionist and gives a "no":** "We take that plan, but we're not taking new patients." This shows the agent understands the answer rather than reading a script.
- **The result updates on screen:** after the call, that therapist drops in the ranking with the reason shown.
- **Backup:** record a video of a working call in case venue wifi or audio fails.

**Final pick: Ghost Network Check over the Rental Listing Duplicate Checker.** With the staged call, its main weakness is gone. A live voice agent is more memorable than a match result, Bright Data, Gemini and ElevenLabs each do real work, and "86% of listed providers were unreachable, out of network or not taking new patients" opens the pitch strongly. The rental checker gives a cleaner yes/no answer with simpler scraping, but both fit the build window and Ghost Network is estimated at 14 hours.

**Before committing:** spend 10 minutes searching for an existing patient-facing tool that checks insurer directories, since the "nobody does this" claim rests on one search.
