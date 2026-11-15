# 26 Connect the patient after a successful check (GitHub #50)

**Owner:** Aditya · **Priority:** P2 (stretch) · **Time box:** 2 h, abandon if no three-way call works within 1 h · **Depends on:** #45, #48, #49

## Why

When the agent finds an office that takes the plan and is taking new patients, the user still has to call back, and the office may not answer the second time. The record's section 11 ("Call and connect") proposed connecting them straight away. The planning round kept the safe part of that idea:

- The agent asks its questions first (that is the check that makes TheraCheck different).
- Only if both answers are yes does it offer to connect.
- It rings the user, joins the calls, and **drops off before patient and office talk**, so nobody's conversation is monitored (California Penal Code § 632 risk).
- No texts: US carriers need A2P registration, which takes days.

## Before and after

|                       | Before                                   | After                                                                                                              |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| After a yes/yes check | The agent hangs up; the user calls later | The agent says "Please hold, I'm connecting the patient", rings the user, joins them, then leaves                  |
| User's phone number   | Not collected                            | Asked only when they tap "Check and connect me", held in memory for the call, never stored                         |
| User consent          | Not asked                                | A tick box: "Call me at this number and connect me to the office. The assistant will leave once you're connected." |

## What to build

1. **Page:** on listings whose `paths` include `agent_check`, a second button "Check and connect me" next to "Ask the assistant". It asks for the user's number and the consent tick box before starting.
2. **Start:** `POST /api/calls/start` accepts an optional `connectTo` number. For the hackathon it must be on `DEMO_CALL_ALLOWLIST` too. It is passed to the agent as a dynamic variable or kept server-side, never written to the database or logs.
3. **Agent:** a new tool `connect_patient`, called only after `save_call_result` returns with both answers yes. Read the current ElevenLabs and Twilio docs for transferring or conferencing an outbound call (ElevenLabs' transfer-to-number system tool, or a Twilio conference) and pick the one that lets the agent leave the call. If neither works within the time box, stop and report.
4. **Fallback:** if the office says no, or the transfer fails, the agent says goodbye as today and the user sees the result.

## Acceptance check

- On stage: teammate A plays the office, teammate B is the patient. The agent asks, saves, says "Please hold", B's phone rings, A and B talk, and the call history shows the agent's leg ended before they spoke.
- The user's number does not appear in the database, the server logs or the API responses (test with a grep after a run).
- A listing that is not `landline` never shows the button; the route refuses `connectTo` for it.
- Full local CI passes.

## Prompt for your Claude

```
Read AGENTS.md, docs/issues/26-connect-call.md, docs/issues/24-api-booking-report-mobile-guard.md, docs/issues/25-voice-disclosure-optout.md, reports/TheraCheck project record.md section 11, voice/README.md, src/app/api/calls/start/route.ts and src/frontend/CallPanel.tsx.
Fetch the current ElevenLabs docs on transfer-to-number and outbound calls, and Twilio's docs on conferences, before writing code. Pick the approach that lets the agent leave the call, and explain the choice.
Write failing tests for the route changes first. Never store the user's number. Keep the time box: if no three-way call works within an hour, stop and report what you tried.
Never read .env.local or run db:reset; Docker database only. Commit with plain conventional commits, no co-author trailer. Do not push.
```
