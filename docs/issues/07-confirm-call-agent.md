# 07 Confirm-call voice agent in the browser

**Owner:** Aditya · **Priority:** P0 · **Time box:** 2 h · **Depends on:** 06

## User stories
- US-F3-M: the app makes the call for Maya.
- US-F3-R: the agent asks the awkward questions for Robert.
- US-F3-E: the result is recorded in plain words for Elena.
- US-F3-D: the result is stored as a call, so Dana sees it marked as confirmed.

## What to build
An ElevenLabs Agents conversational agent that plays the caller. In the browser, a teammate plays the receptionist through the laptop microphone. No telephone setup in this issue.

The conversation:
1. Agent opens: "Hi, this is an automated assistant calling for a patient. I have two quick questions."
2. "Does {therapist name} accept {insurer}?"
3. "Is {therapist name} accepting new patients?"
4. Agent thanks them and ends.
5. Agent calls its tool with the two answers and a one-sentence summary.

Rules:
- **Vague answers (Review Focus 3):** "call back Monday", "I'm not sure", voicemail or silence are recorded as `unknown`. The agent asks each question at most twice and never argues.
- The agent gives no patient details and no medical information.
- **Every call is a demo call.** The person answering is a teammate, not the office, and the page is public. The widget always shows "Demo call. No real office was contacted.", and results use the `Demo call: ...` labels, so nobody reads a staged answer as a fact about a real therapist.
- Total call under 60 seconds.
- Therapist name, insurer and listing id are passed in when the conversation starts.

## Files
- Create: `voice/agent-confirm.md` (the agent's system prompt and first message), `voice/README.md` (how the agent, its tool and its variables are configured in the ElevenLabs dashboard), `components/VoiceWidget.tsx`

## Interfaces
- **Consumes:** `POST /api/calls/result` with header `x-webhook-secret`, body `{ listingId, takesPlan, acceptingNew, summary }`.
- **Produces:** `<VoiceWidget mode="confirm" listingId name insurer onDone={(r: { score: number; label: string }) => void} />`. It shows one button to start, a visible "listening" or "speaking" state, and one button to stop. It is the only file that loads the ElevenLabs client. Tracy places it in issue 09.
- The agent's tool is named `save_call_result`.

## Acceptance check
Run each by speaking as the receptionist:
- "Yes we take that plan, and yes we're taking new patients" → call saved with `yes`, `yes`; listing shows `Demo call: available`.
- "We take it, but we're full" → `yes`, `no`; listing shows `Demo call: unavailable` and drops to the bottom.
- "You'd have to call back Monday" → `unknown`, `unknown`; score unchanged.
- The agent's first sentence says it is an automated assistant.
- `voice/README.md` lets a teammate recreate the agent from scratch.
- The deployed Vercel URL can reach the tool endpoint. For local testing, note the tunnel used.

## Prompt for your Claude
```
Read CLAUDE.md, the plan's "Global Constraints" and "Review Focus", and docs/issues/07-confirm-call-agent.md.
Read the current ElevenLabs Agents docs for: creating an agent, dynamic variables, server tools (webhooks) with custom headers, and the React/JavaScript client for starting a conversation in the browser. Do not rely on memory for SDK names.

Write voice/agent-confirm.md: the system prompt and first message implementing the conversation and rules in the issue, with {{therapist_name}}, {{insurer}} and {{listing_id}} as variables. Include the instruction to record anything vague as "unknown".
Write voice/README.md: step-by-step dashboard setup, including the save_call_result server tool pointing at /api/calls/result with the x-webhook-secret header and the three fields constrained to yes/no/unknown.
Write components/VoiceWidget.tsx with the props in the issue. Keep it accessible: real buttons, a text status that screen readers announce, and a visible transcript of the last agent line.
I will create the agent in the dashboard myself from the README; tell me exactly what to paste where.
Do not touch collector/ or verifier/. Do not commit; show me the diff and a proposed commit message.
```
