# 13 Real phone call through Twilio

**Owner:** Aditya · **Priority:** P2 (stretch) · **Time box:** 1.5 h, abandon if not ringing a phone within 45 min · **Depends on:** 07

Only start this if every P0 issue is merged. The browser version from issue 07 is already a complete demo.

## User stories

- US-F3-M, US-F3-R: the app really does make the call, to a real phone.
- US-F3-D: a phone-confirmed result is recorded the same way as a browser one.

## What to build

Connect the confirm agent from issue 07 to a Twilio phone number so it places an outbound call. On stage it rings a teammate's phone, who answers as the receptionist.

Rules:

- **It only ever dials numbers on an allow-list** of teammates' phones kept in an environment variable. It must refuse any other number, including the listing's real office number. No real office is called during the hackathon.
- The agent's opening line still says it is an automated assistant.
- The result is saved through the same `save_call_result` tool.

## Files

- Create: `app/api/calls/start/route.ts`
- Modify: `voice/README.md` (Twilio setup), `.env.example` (add `DEMO_CALL_ALLOWLIST`, comma-separated), `components/CallPanel.tsx` (a "Call a phone instead" option, with Tracy)

## Interfaces

- **Consumes:** the confirm agent and `save_call_result`.
- **Produces:** `POST /api/calls/start` with body `{ listingId, toNumber }`; returns 403 when `toNumber` is not on the allow-list.

## Acceptance check

- A teammate's phone rings, the agent asks both questions, and the listing's badge updates.
- Posting a number that is not on the allow-list returns 403 and no call is placed.
- A recording of one successful call is saved as the backup for the video.

## Prompt for your Claude

```
Read CLAUDE.md, the plan's "Global Constraints", voice/README.md and docs/issues/13-real-phone-call.md.
Read the current ElevenLabs Agents docs on Twilio phone numbers and outbound calls before writing anything.

Write app/api/calls/start/route.ts: validate that toNumber is in DEMO_CALL_ALLOWLIST and return 403 otherwise; then start an outbound call with the confirm agent, passing therapist name, insurer and listing id as variables.
Add the Twilio setup steps to voice/README.md.
The allow-list check is a safety control: do not add any way around it, and write one test proving a number off the list is refused.
Do not commit; show me the diff and a proposed commit message.
```
