# 12 Patient helper voice agent

**Owner:** Aditya · **Priority:** P1 · **Time box:** 1.5 h · **Depends on:** 06, 07

Decide at the Sat 9 PM checkpoint whether to do this.

## User stories

- US-F4-M: ask out loud while walking, without typing.
- US-F4-R: have a conversation and hear the top three with phone numbers.
- US-F4-E: ask in her own words, without knowing the form fields.
- US-F4-D: a voice option Dana can point students to.

## What to build

A second ElevenLabs agent that talks to the patient, not to an office. It is the non-screen way into the same data.

The conversation:

1. "Hi, I can help you find a therapist who is likely to pick up. Which insurance do you have, and what city are you in?"
2. It calls its tool to fetch the list.
3. It reads the top three: name, the one-line reason, and the phone number digit by digit. It offers to repeat or to read the next three.
4. It ends with: "This is based on public web pages. Only the office can confirm."

Rules:

- It reads only what the tool returns. If the tool returns nothing, it says we do not have that insurer and city yet and names the one we do have.
- It gives no medical advice. If the caller mentions a crisis or self-harm, it says to call or text 988 and stops reading listings.
- Sentences are short and slow enough to write a number down.

## Files

- Create: `voice/agent-helper.md`
- Modify: `voice/README.md` (setup for the second agent), `src/frontend/VoiceWidget.tsx` (add `mode="helper"`), `.env.example` (add `NEXT_ELEVENLABS_HELPER_AGENT_ID`)

## Interfaces

- **Consumes:** `GET /api/listings?insurer=&city=` as the agent's tool, named `find_therapists`.
- **Produces:** `<VoiceWidget mode="helper" />` with no other props. Tracy places it on the home page under the search form with the label "Or ask out loud".

## Acceptance check

- Saying "I have Aetna and I'm in San Diego" gets the top three fixture or real listings read back, with phone numbers spoken digit by digit.
- Saying "I have Kaiser in Fresno" gets the no-data reply naming the supported insurer and city.
- Saying "can you repeat the second one" repeats it.
- Mentioning a crisis gets the 988 line and no listings.
- The agent never states that a therapist is in-network; it uses the labels.
- Tell Tracy the widget is ready to place.

## Prompt for your Claude

```
Read CLAUDE.md, the plan's "Global Constraints" and "Features and user stories" (F4), voice/README.md and docs/issues/12-patient-helper-voice-agent.md.

Write voice/agent-helper.md: system prompt and first message for the conversation and rules in the issue, including the 988 rule and the instruction to read phone numbers digit by digit and to say only what the find_therapists tool returns.
Extend voice/README.md with dashboard setup for this second agent and its find_therapists server tool (GET /api/listings with insurer and city as query parameters).
Extend src/frontend/VoiceWidget.tsx with mode="helper", reading the agent id from NEXT_ELEVENLABS_HELPER_AGENT_ID. Do not break mode="confirm".
Do not commit; show me the diff and a proposed commit message.
```
