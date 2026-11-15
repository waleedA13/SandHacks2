import {
  claimCallSlot,
  failCall,
  getCallTarget,
  isUuid,
} from "@/backend/queries";

// Places a real phone call with the confirm agent through the Twilio number
// imported into ElevenLabs. It only ever dials a teammate's phone on
// DEMO_CALL_ALLOWLIST; no real office is called.
const E164 = /^\+[1-9]\d{7,14}$/;

const reply = (status: number, body: object, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

// Strict: a missing or empty list allows nothing, and an entry that is not E.164 never matches.
function allowed(toNumber: string): string | null {
  const n = toNumber.replace(/[\s\-.()]/g, "");
  const list = (process.env.DEMO_CALL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => E164.test(s));
  return E164.test(n) && list.includes(n) ? n : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !isUuid(body.listingId) ||
    typeof body.toNumber !== "string"
  )
    return reply(400, {
      error: "body must be { listingId: uuid, toNumber: string }",
    });

  // The listing's own line type, never the body or the number dialled: the agent only calls landlines.
  const target = await getCallTarget(body.listingId);
  if (!target) return reply(404, { error: "listing not found" });
  if (target.lineType !== "landline")
    return reply(403, {
      error: "We only place assistant calls to office landlines.",
    });

  const toNumber = allowed(body.toNumber);
  if (!toNumber)
    return reply(403, { error: "That number is not on the demo allow-list." });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_ELEVENLABS_AGENT_ID;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  if (!apiKey || !agentId || !phoneNumberId)
    return reply(500, { error: "Phone calls are not configured." });

  if (target.optedOut)
    return reply(403, { error: "This office asked not to be called." });

  const callId = await claimCallSlot(body.listingId);
  if (!callId)
    return reply(
      429,
      { error: "A call started less than a minute ago. Try again shortly." },
      { "Retry-After": "60" },
    );

  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: toNumber,
          conversation_initiation_client_data: {
            dynamic_variables: {
              listing_id: body.listingId,
              therapist_name: target.name,
              insurer: target.insurer,
            },
          },
        }),
        cache: "no-store",
      },
    );
    // The upstream body can echo account details; log the status only.
    const data = res.ok
      ? ((await res.json()) as {
          success?: unknown;
          callSid?: unknown;
          conversation_id?: unknown;
        })
      : null;
    const callSid = typeof data?.callSid === "string" ? data.callSid : null;
    const conversationId =
      typeof data?.conversation_id === "string" ? data.conversation_id : null;
    if (data?.success === true && (callSid || conversationId))
      return reply(200, { ok: true, callSid, conversationId });
    console.error(`ElevenLabs outbound call failed: ${res.status}`);
  } catch {
    console.error("ElevenLabs outbound call threw");
  }
  await failCall(callId);
  return reply(502, { error: "Could not place the call." });
}
