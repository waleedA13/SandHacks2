# Voice agent setup

TheraCheck has one ElevenLabs agent, **TheraCheck confirm call**. It plays a caller who asks an office two questions and saves the answers through `POST /api/calls/result`. During the hackathon a teammate always plays the receptionist. Nobody calls a real office.

How the pieces connect:

1. `components/VoiceWidget.tsx` asks `POST /api/voice/token` for a conversation token. That route holds `ELEVENLABS_API_KEY` and `NEXT_ELEVENLABS_AGENT_ID`; the browser sees only the token.
2. The widget starts the call with the token and three dynamic variables: `listing_id`, `therapist_name`, `insurer`.
3. At the end of the call the agent runs its `save_call_result` webhook tool. ElevenLabs posts the answers to `/api/calls/result` with the `x-webhook-secret` header.
4. The route returns the listing's new `{ score, label }`. ElevenLabs forwards that result to the widget as an `agent_tool_response_full_payload` event, and the widget hands it to `onDone`.

The steps below rebuild the agent from nothing. Dashboard labels move around between ElevenLabs releases; if a label differs, look for the setting with the same meaning.

## 1. Environment variables

Set these in Vercel (Production and Preview) and in `.env.local` for local runs:

| Name                       | Value                                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| `ELEVENLABS_API_KEY`       | An ElevenLabs API key with access to ElevenAgents. Server-only.         |
| `NEXT_ELEVENLABS_AGENT_ID` | The agent id (`agent_...`) from step 2. Server-only; no `NEXT_PUBLIC_`. |
| `CALLS_WEBHOOK_SECRET`     | `openssl rand -hex 32`. The same value goes into the tool header below. |

Redeploy after changing them.

## 2. Create the agent

1. ElevenLabs dashboard → **ElevenAgents** → **Agents** → **New agent** → **Blank agent**. Name it `TheraCheck confirm call`.
2. Copy the agent id from the agent's page into `NEXT_ELEVENLABS_AGENT_ID`.

## 3. Agent tab

1. **Language:** English.
2. **First message:** paste the "First message" block from `voice/agent-confirm.md`.
3. **System prompt:** paste the "System prompt" block from `voice/agent-confirm.md`.
4. **Dynamic variables:** the dashboard picks up `therapist_name`, `insurer` and `listing_id` from the prompt. Give each a test value so dashboard tests work, for example `therapist_name` = `Avery Example`, `insurer` = `Aetna`, and `listing_id` = an id from `GET https://<your-vercel-domain>/api/listings?insurer=Aetna&city=San%20Diego`.
5. **LLM:** a fast model; the call is short and simple.
6. **Tools → System tools:** turn on **End call**.

## 4. Voice tab

Pick a clear, calm English voice. Leave speed at the default.

## 5. The `save_call_result` tool

Agent tab → **Tools** → **Add tool** → **Webhook**.

| Field       | Value                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Name        | `save_call_result`                                                                                   |
| Description | `Save the office's two answers at the end of the call. Call it once, after saying goodbye.`          |
| Method      | `POST`                                                                                               |
| URL         | `https://<your-vercel-domain>/api/calls/result` (the production domain, not a preview URL with auth) |

**Headers:** add one header.

| Name               | Type   | Value                                                                       |
| ------------------ | ------ | --------------------------------------------------------------------------- |
| `x-webhook-secret` | Secret | **Create new secret**, name it `calls_webhook_secret`, paste the env value. |

**Body parameters** (content type JSON):

| Identifier     | Type   | Required | Value type       | Setting                                                                                                                |
| -------------- | ------ | -------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `listingId`    | string | yes      | Dynamic variable | `listing_id`                                                                                                           |
| `takesPlan`    | string | yes      | LLM prompt       | Enum `yes`, `no`, `unknown`. Description: `Does the therapist accept the insurance? Use unknown for anything unclear.` |
| `acceptingNew` | string | yes      | LLM prompt       | Enum `yes`, `no`, `unknown`. Description: `Is the therapist taking new patients? Use unknown for anything unclear.`    |
| `summary`      | string | yes      | LLM prompt       | Description: `One plain sentence on what the office said, with no patient details.`                                    |

`listingId` comes from the dynamic variable, so the model cannot get it wrong. If your dashboard has no enum field, put `Must be exactly yes, no or unknown.` at the start of the description; the route rejects anything else with a 400.

Save the tool.

## 6. Security tab

1. Turn on **Enable authentication**. Conversations then start only with a token from `/api/voice/token`, so nobody can use the agent id on its own.
2. Leave the hostname allowlist empty. ElevenLabs allows one of the two methods per agent.

## 7. Advanced tab

1. **Client events:** turn on `agent_tool_response_full_payload` (keep the defaults on, including `agent_response` and `agent_tool_response`). Without it the widget never receives the score and `onDone` does not fire. The payload holds only `{ score, label }`.
2. **Max conversation duration:** 90 seconds. The prompt aims for under 60; the extra time lets the save finish.

## 8. Test in the dashboard

You need issue #10's `/api/calls/result` deployed, the env variables set, and a seeded database.

1. On the agent page click **Test AI agent**. A teammate plays the receptionist.
2. Run the three acceptance lines from `docs/issues/07-confirm-call-agent.md`:
   - "Yes we take that plan, and yes we're taking new patients" → the listing shows `Demo call: available`.
   - "We take it, but we're full" → `Demo call: unavailable`, and the listing drops to the bottom.
   - "You'd have to call back Monday" → both `unknown`; the score stays the same.
3. Check that the first sentence says it is an automated assistant.
4. Open the conversation under **Call history** and check that `save_call_result` returned `200` with `{ score, label }`. A `401` means the header secret and `CALLS_WEBHOOK_SECRET` differ.

## 9. Test from the app

1. Open a page that renders `<VoiceWidget mode="confirm" ... />`, press **Start demo call** and allow the microphone.
2. The status line reads "Listening" or "Assistant speaking". After the save it reads `Saved. Demo call: ...`.

For a local run the tool still needs a public URL, because ElevenLabs calls the webhook from its servers. Point the tool URL at a tunnel to `localhost:3000` (for example `ngrok http 3000`) while testing, note the tunnel in the PR, and set the URL back to the Vercel domain afterwards.

## Real phone calls (Twilio)

The same confirm agent can ring a real phone instead of talking in the browser. `POST /api/calls/start` asks ElevenLabs to place an outbound call through the Twilio number imported into ElevenLabs. On stage it rings a teammate's phone, and the teammate plays the receptionist.

**It only ever dials a number on `DEMO_CALL_ALLOWLIST`.** Any other number, including the listing's own office phone, gets a `403` and no call. The route never reads the listing's phone. No real office is called during the hackathon.

### Already done

- A Twilio number is bought, the account is upgraded, and the number is imported into ElevenLabs. Test calls from the ElevenLabs dashboard work.
- Voicemail detection is on for the agent.

### Environment variables

Add these in Vercel (Production and Preview) next to the ones in step 1, then redeploy:

| Name                         | Value                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ELEVENLABS_PHONE_NUMBER_ID` | The imported number's id (`phnum_...`), from **ElevenAgents** → **Phone numbers**. Server-only.         |
| `DEMO_CALL_ALLOWLIST`        | Teammates' phones as E.164, comma-separated, no spaces: `+16195550123,+16195550188`. Empty refuses all. |

`ELEVENLABS_API_KEY` and `NEXT_ELEVENLABS_AGENT_ID` from step 1 are reused. The key needs ElevenAgents write access to place calls.

### The route

`POST /api/calls/start` with JSON `{ "listingId": "<uuid>", "toNumber": "+16195550123" }`:

| Status | Meaning                                                              |
| ------ | -------------------------------------------------------------------- |
| `200`  | `{ ok: true, callSid, conversationId }`. The phone is ringing.       |
| `400`  | The body is malformed or `listingId` is not a UUID.                  |
| `403`  | `toNumber` is not on the allow-list.                                 |
| `404`  | No listing with that id.                                             |
| `429`  | Another call started less than 60 seconds ago. Wait and press again. |
| `500`  | An env variable is missing.                                          |
| `502`  | ElevenLabs refused the call. Look at the agent's **Call history**.   |

The route strips spaces, dashes, dots and parentheses from `toNumber`, then requires an exact match with one allow-list entry. `+1 (619) 555-0123` matches `+16195550123`; a number one digit off does not.

The agent gets the same dynamic variables as the browser call: `listing_id`, `therapist_name` and `insurer`. At the end it saves the answers through the same `save_call_result` tool, so the listing's badge updates the same way.

To stop a double press or a loop from ringing a phone over and over and spending money, the route allows one outbound call per 60 seconds for the whole app. Each started call is stored as an `in_progress` row in `calls`; the result the agent saves is a separate `done` row. A call ElevenLabs refuses is marked `failed` and frees the slot at once.

From a client component (the "Call a phone instead" option in `components/CallPanel.tsx`):

```ts
const res = await fetch("/api/calls/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ listingId, toNumber }),
});
// 403: not on the allow-list. 429: wait a minute. Anything else not ok: the call did not start.
```

The page cannot learn the allow-list; the presenter types or picks their own number.

### Test with a teammate's phone

1. Put the teammate's number in `DEMO_CALL_ALLOWLIST` in Vercel and redeploy.
2. Check the refusal first. It places no call:
   ```bash
   curl -i -X POST https://<your-vercel-domain>/api/calls/start -H "Content-Type: application/json" -d '{"listingId":"<id>","toNumber":"+15555550100"}'
   ```
   Expect `403`.
3. Send the same request with the teammate's number. Their phone rings within a few seconds.
4. The first thing the agent says is that it is an automated assistant. The teammate answers the two questions as the receptionist.
5. After the call, reload the listing. Its badge reads `Demo call: ...`. Under **Call history** the conversation shows `save_call_result` returning `200`.
6. Save the recording of one good call from **Call history** as the backup for the video.

After the demo, set `DEMO_CALL_ALLOWLIST` to empty in Vercel and redeploy. The route is public, so anyone who knows a listed number could otherwise ring it once a minute.

If the phone does not ring, open the agent's **Call history** in ElevenLabs. A `502` from the route with nothing there means the request was rejected; check `ELEVENLABS_PHONE_NUMBER_ID` and the key's permissions.
