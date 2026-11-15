# Voice agent setup

TheraCheck has one ElevenLabs agent, **TheraCheck confirm call**. It plays a caller who asks an office two questions and saves the answers through `POST /api/calls/result`. During the hackathon a teammate always plays the receptionist. Nobody calls a real office.

How the pieces connect:

1. `src/frontend/VoiceWidget.tsx` asks `POST /api/voice/token` for a conversation token. That route holds `ELEVENLABS_API_KEY` and `NEXT_ELEVENLABS_AGENT_ID`; the browser sees only the token.
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
| Description | `Save the office's two answers at the end of the call. Call it once, before saying goodbye.`         |
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
2. **Max conversation duration:** 90 seconds. The prompt aims for under 60; the extra time lets the save finish. Set the duration message to `Sorry, I have to end the call now. Thank you for your time. Goodbye.`
3. **End conversation after silence:** 20 seconds. The prompt says goodbye after about 10 seconds of silence; this ends the call if the agent never does.
4. **Take turn after silence:** 7 seconds, so "let me check" gets time before the agent speaks again.

## 7a. Privacy settings

The agent tells the office the call is transcribed. Keep no more than that:

1. **Audio storage** (in **Privacy** or **Advanced**, sometimes "Store call audio" or "Save audio"): **off** for the confirm agent. ElevenLabs keeps no recording of the office's voice.
2. **Transcript retention** ("Conversation retention" or "Data retention"): the shortest period the dashboard offers. The app needs only the four fields `save_call_result` posts; the transcript is for debugging.
3. **Data sharing / model training** (any setting that lets ElevenLabs use conversations to improve its models): **off**.

The opt-out works without any dashboard setting. When the office says it does not want these calls, the agent saves the summary `Opted out of calls.`, and `/api/calls/result` puts the listing's phone on the `do_not_call` table. From then on `POST /api/calls/start` refuses that listing with `403 { error: "This office asked not to be called." }`. The table matches on the last 10 digits, so `(619) 555-0101` and `+1 619 555 0101` count as one number. Nothing in the app removes a number; delete the row in the database by hand if an office asks to be called again.

On an existing database, add the table with `src/backend/db/migrations/003-do-not-call.sql`. It is safe to run twice. `db:reset` creates it from `schema.sql`.

The ending runs in this order: save, then one goodbye, then `end_call`. If the agent says goodbye before it saves, the model speaks again after the tool returns and the caller hears goodbye twice. If it never calls `end_call`, the line stays open until the silence limit. **Tools → System tools → End conversation** must be on.

## 8. Test in the dashboard

You need issue #10's `/api/calls/result` deployed, the env variables set, and a seeded database.

1. On the agent page click **Test AI agent**. A teammate plays the receptionist.
2. Run the three acceptance lines from `docs/issues/07-confirm-call-agent.md`:
   - "Yes we take that plan, and yes we're taking new patients" → the listing shows `Demo call: available`.
   - "We take it, but we're full" → `Demo call: unavailable`, and the listing drops to the bottom.
   - "You'd have to call back Monday" → both `unknown`; the score stays the same.
3. Check that the first sentence contains "AI voice", "TheraCheck" and "transcribed".
4. Say "please don't call us again". The agent says "Understood. We won't call this number again. Goodbye." once and hangs up. Under **Call history** `save_call_result` shows summary `Opted out of calls.`, and `POST /api/calls/start` for that listing now returns `403`.
5. Open the conversation under **Call history** and check that `save_call_result` returned `200` with `{ score, label }`. A `401` means the header secret and `CALLS_WEBHOOK_SECRET` differ.

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
| `403`  | `toNumber` is not on the allow-list, or the office opted out.        |
| `404`  | No listing with that id.                                             |
| `429`  | Another call started less than 60 seconds ago. Wait and press again. |
| `500`  | An env variable is missing.                                          |
| `502`  | ElevenLabs refused the call. Look at the agent's **Call history**.   |

The route strips spaces, dashes, dots and parentheses from `toNumber`, then requires an exact match with one allow-list entry. `+1 (619) 555-0123` matches `+16195550123`; a number one digit off does not.

The agent gets the same dynamic variables as the browser call: `listing_id`, `therapist_name` and `insurer`. At the end it saves the answers through the same `save_call_result` tool, so the listing's badge updates the same way.

To stop a double press or a loop from ringing a phone over and over and spending money, the route allows one outbound call per 60 seconds for the whole app. Each started call is stored as an `in_progress` row in `calls`; the result the agent saves is a separate `done` row. A call ElevenLabs refuses is marked `failed` and frees the slot at once.

From a client component (the "Call a phone instead" option in `src/frontend/CallPanel.tsx`):

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
4. The agent's first sentence says it is an AI voice from TheraCheck and that the call is transcribed. The teammate answers the two questions as the receptionist.
5. After the call, reload the listing. Its badge reads `Demo call: ...`. Under **Call history** the conversation shows `save_call_result` returning `200`.
6. Audio storage is off (step 7a), so **Call history** has no recording. For the video backup, record one good call on a second device or with screen and audio capture, with the teammate's agreement.

After the demo, set `DEMO_CALL_ALLOWLIST` to empty in Vercel and redeploy. The route is public, so anyone who knows a listed number could otherwise ring it once a minute.

If the phone does not ring, open the agent's **Call history** in ElevenLabs. A `502` from the route with nothing there means the request was rejected; check `ELEVENLABS_PHONE_NUMBER_ID` and the key's permissions.

## Patient helper agent

The second agent, **TheraCheck patient helper**, talks to the patient instead of an office. It asks for their insurance and city, fetches the ranked list with its `find_therapists` tool, and reads the top three aloud. It is the way to get the list without a screen. The prompt is in `voice/agent-helper.md`.

How it connects:

1. `<VoiceWidget mode="helper" />` sends `POST /api/voice/token` with the body `{ "agent": "helper" }`. The route looks up `NEXT_ELEVENLABS_HELPER_AGENT_ID` and returns only a conversation token. A request with no body still gets a confirm-call token, and any other `agent` value gets a 400.
2. The widget starts the conversation with that token. It passes no dynamic variables.
3. The agent calls `find_therapists`, a GET webhook to the public `GET /api/listings?insurer=&city=` route. It needs no secret, because that route is read-only and public.

### H1. Environment variable

Add this in Vercel (Production and Preview) and in `.env.local`, then redeploy:

| Name                              | Value                                                                      |
| --------------------------------- | -------------------------------------------------------------------------- |
| `NEXT_ELEVENLABS_HELPER_AGENT_ID` | The helper agent id (`agent_...`) from H2. Server-only; no `NEXT_PUBLIC_`. |

It uses the same `ELEVENLABS_API_KEY` as the confirm agent.

### H2. Create the agent

1. **ElevenAgents** → **Agents** → **New agent** → **Blank agent**. Name it `TheraCheck patient helper`.
2. Copy its agent id into `NEXT_ELEVENLABS_HELPER_AGENT_ID`.

### H3. Agent tab

1. **Language:** English.
2. **First message:** paste the "First message" block from `voice/agent-helper.md`.
3. **System prompt:** paste the "System prompt" block from `voice/agent-helper.md`. Keep the safety rule at the top.
4. **LLM:** a model that follows instructions well. This agent has more rules than the confirm agent, so do not pick the smallest model.
5. **Tools → System tools:** turn on **End call**.

### H4. Voice tab

Pick a calm, clear English voice. Set speed a little below the default, for example 0.9, so callers can write numbers down.

### H5. The `find_therapists` tool

Agent tab → **Tools** → **Add tool** → **Webhook**.

| Field            | Value                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| Name             | `find_therapists`                                                                    |
| Description      | `Get the ranked list of therapists for an insurance company and a city. Best first.` |
| Method           | `GET`                                                                                |
| URL              | `https://theracheck.vercel.app/api/listings`                                         |
| Response timeout | 20 seconds (the default)                                                             |

Add no headers and no auth connection.

**Query parameters:**

| Identifier | Type   | Required | Value type | Description                                                                    |
| ---------- | ------ | -------- | ---------- | ------------------------------------------------------------------------------ |
| `insurer`  | string | yes      | LLM prompt | `The insurance company name the caller gave, for example Aetna. No plan name.` |
| `city`     | string | yes      | LLM prompt | `The city the caller gave, without the state, for example San Diego.`          |

**Response filter**, if your dashboard shows one: set the mode to **Allow** and keep only `name`, `label`, `reason` and `phone`. The route returns a JSON array of listings, and the ElevenLabs docs do not say whether these paths reach into array items. After saving, run one dashboard test and open the tool result under **Call history**. If it comes back empty, set the mode back to **All**. The prompt reads only those four fields either way.

Save the tool.

### H6. Security tab

1. Turn on **Enable authentication**, as for the confirm agent. Conversations then start only with a token from `/api/voice/token`.
2. Leave the hostname allowlist empty.

### H7. Advanced tab

1. **Client events:** keep the defaults (`agent_response`, `user_transcript`, `agent_tool_response`). Leave `agent_tool_response_full_payload` off. The widget shows the agent's last line and does not need the tool result.
2. **Max conversation duration:** 300 seconds. Reading three listings slowly, with repeats, takes longer than the confirm call.

### H8. Test in the dashboard

Click **Test AI agent** and run the acceptance lines from `docs/issues/12-patient-helper-voice-agent.md`:

- "I have Aetna and I'm in San Diego" → three listings, each with name, label, reason and a phone number read digit by digit.
- "I have Kaiser in Fresno" → "We don't have that insurance and city yet. Right now we have Aetna in San Diego."
- "Can you repeat the second one" → the second listing again.
- A crisis line, for example "I don't want to be alive anymore" → the 988 line and no listings, also when asked again.
- Check it never says a therapist is in-network, and that it ends with "This is based on public web pages. Only the office can confirm."

### H9. Test from the app

Open a page that renders `<VoiceWidget mode="helper" />`, press **Start talking** and allow the microphone. The status line reads "Listening" or "Assistant speaking", and the widget shows what the assistant last said.
