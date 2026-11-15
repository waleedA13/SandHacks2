# 15 Demo data, pitch, video and Devpost

**Owners:** All three · **Priority:** P0 · **Time box:** 2 h, Sun 9:30-11:30 AM · **Depends on:** every P0 issue

The hacker guide says the demo is the most important part of the video, and recommends keeping two hours for this. Feature freeze is Sun 9:30 AM.

## What to do

**Demo data (Waleed), by Sun 9:00 AM**

- Final run of the directory collector, evidence collector and verifier into the production Neon database.
- Write down the numbers for the pitch: listings checked, how many are `Likely dead end`, Bright Data requests used, seconds for one live re-check.
- Pick the three listings used in the demo: one `Likely available`, one `Likely dead end` with a clear reason, and one to confirm by voice.
- Query the database once just before recording so it is awake.
- Empty the `calls` table before recording and again before judging, so the only call results on the public site are the ones made on stage.

**Pitch (all), 3 minutes, then 2 minutes of questions**

1. **Problem, 30 s.** A Senate study could book an appointment from insurer directories 18% of the time. Open the linked source if asked.
2. **Search, 30 s.** Pick the insurer and city on a phone. Read the accuracy sentence from our own data.
3. **Evidence, 40 s.** Open the dead-end listing; show the reason and the source link.
4. **Voice, 50 s.** Start the confirm call; a teammate answers "we take it, but we're full". Watch the badge change. Say that the call is staged because offices are closed on weekends.
5. **How it works, 20 s.** Bright Data reads the directory and the rest of the web; Gemini turns pages into three facts; ElevenLabs asks the office.
6. **Honest limits, 10 s.** Web pages suggest; only the office confirms.

**Video (Tracy leads)**

- Screen recording of a phone-sized window plus voice-over, 3 minutes or less.
- Record the voice call twice and keep the better take.
- Upload to YouTube or Google Drive with visibility set to Public.

**Devpost (Aditya leads)**

- Placeholder submission by Sun 11:00 AM with team members and tracks: Data for Good (Bright Data), Best Project Built with ElevenLabs, Best Use of Gemini API, Neon, Best Overall.
- Final by Sun 12:00 PM: video link, write-up, GitHub link, live demo link.
- The write-up states plainly what is staged or limited: one insurer, one city, staged call, and anything from `docs/smoke-test.md` and `docs/accessibility-check.md` that is still open.

**Repository (Waleed)**

- README with what it is, how to run it, and the architecture in five lines.
- Confirm no keys are in the repository history.
- **Last commit before Sun 12:00 PM. Nothing after.**

## Files

- Create: `docs/demo-script.md`, `README.md` (replace the placeholder)

## Acceptance check

- A full run-through of the pitch takes 3 minutes or less, timed, twice.
- The video link opens in a private browser window.
- Devpost shows the final submission before 12:00 PM.
- `git log -1` shows a commit time before Sun 12:00 PM.

## Prompt for your Claude

```
Read docs/spec/ghost-network-check.md, the plan, docs/smoke-test.md, docs/accessibility-check.md and docs/issues/15-demo-video-devpost.md.

Write docs/demo-script.md: a word-for-word 3-minute script following the six beats in the issue, with who speaks and what is on screen for each, using the real numbers I give you. Then list the five questions a judge is most likely to ask, with a two-sentence honest answer to each.
Draft the Devpost write-up sections (inspiration, what it does, how we built it, challenges, accomplishments, what we learned, what's next). State every limitation plainly; do not claim anything we did not build or test.
Rewrite README.md with what it is, how to run it, and the architecture in five lines.
Use only statistics that appear in the spec with a VERIFIED label, or numbers from our own database.
Do not commit; show me the diff and a proposed commit message.
```
