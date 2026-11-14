# 11 Live re-check

**Owners:** Waleed (worker), Tracy (button) · **Priority:** P1 · **Time box:** 1.5 h · **Depends on:** 03, 04, 05, 06, 09

Decide at the Sat 9 PM checkpoint whether to do this. It is also the one live lookup shown on stage.

## User stories
- US-F5-M: re-check the one therapist Maya likes before she calls.
- US-F5-R: one large "check again" button that says when it is done.
- US-F5-E: the old answer stays visible while the new one loads.
- US-F5-D: refresh stale listings before a student appointment.

## What to build
**Worker (Waleed).** A long-running script on a laptop that polls `jobs` for `queued` rows every 2 seconds. For each: mark `running`, call `collectEvidence(listingId)` then `verifyListing(listingId)`, mark `done` and set `finished_at`. On any error mark `failed`. The web app never runs this work itself.

**Button (Tracy).** On the listing page, next to the call panel: "Check again now". It posts to the recheck route, then polls the job every 2 seconds.
- While running: the old result stays on screen with "Checking now. This takes about a minute."
- On `done`: the page shows the new reason, facts, sources and "Last checked just now".
- **On `failed`, or after 120 seconds (Review Focus 5):** "We couldn't check right now. Showing the last result from {date}." The old result stays.

## Files
- Create: `collector/worker.ts`, `components/RecheckButton.tsx`
- Modify: `components/CallPanel.tsx` or `app/listing/[id]/page.tsx` to place the button

## Interfaces
- **Consumes:** `collectEvidence` (issue 04), `verifyListing` (issue 05), `POST /api/listings/[id]/recheck`, `GET /api/jobs/[id]`, `GET /api/listings/[id]`.
- **Produces:** command `npx tsx collector/worker.ts`; `<RecheckButton listingId />`.

## Acceptance check
- With the worker running, pressing the button on a real listing finishes with a fresh "Last checked" time, and the time taken is written down for the pitch.
- With the worker stopped, the button shows the could-not-check message after 120 seconds and the old result is still there.
- Pressing the button twice quickly creates one job.
- Killing the worker mid-job and restarting it does not leave the page stuck: jobs `running` for more than 3 minutes are marked `failed` when the worker starts.
- The status text is announced by a screen reader.

## Prompt for your Claude (Waleed, worker)
```
Read CLAUDE.md, the plan's "Shared contract" and "Review Focus", and docs/issues/11-live-recheck.md.

Write collector/worker.ts: on start, mark any job that has been "running" for more than 3 minutes as "failed". Then loop every 2 seconds: claim one queued job by setting it to "running" in a single UPDATE ... RETURNING so two workers cannot take the same job; call collectEvidence(listingId) from collector/evidence.ts, then verifyListing(listingId) from verifier/verify.ts; set status "done" and finished_at. Catch any error, log it, and set "failed".
Log one line per job with the seconds taken.
Do not change collector/evidence.ts or verifier/verify.ts beyond importing from them. Do not commit; show me the diff and a proposed commit message.
```

## Prompt for your Claude (Tracy, button)
```
Read CLAUDE.md, the plan's "Features and user stories" (F5) and "Review Focus", and docs/issues/11-live-recheck.md.

Write components/RecheckButton.tsx, a client component: on press, POST /api/listings/{id}/recheck, then poll GET /api/jobs/{jobId} every 2 seconds for up to 120 seconds. Show the three states in the issue in an aria-live region. On "done", refresh the page data so the new result appears. Never clear the existing result while waiting.
Place it on the listing page beside the call panel, matching the existing visual style.
Do not commit; show me the diff and a proposed commit message.
```
