import {
  claimCallSlot,
  failCall,
  getCallTarget,
  isUuid,
} from "@/backend/queries";

// Issues a short-lived ElevenLabs conversation token so the browser never sees
// the API key or the agent id. POST, not GET: with Cache Components a GET
// handler can be prerendered at build time and its response cached.
// The body picks the agent: none or { agent: "confirm" } for the office call,
// { agent: "helper" } for the patient helper.
const fail = (status: number, error: string) =>
  Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export async function POST(request: Request) {
  const text = await request.text();
  let body: unknown = {};
  try {
    if (text) body = JSON.parse(text);
  } catch {
    body = null;
  }
  const { agent = "confirm", listingId } =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { agent?: unknown; listingId?: unknown })
      : { agent: null };
  if (agent !== "confirm" && agent !== "helper")
    return fail(400, "Unknown voice agent.");

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId =
    agent === "helper"
      ? process.env.NEXT_ELEVENLABS_HELPER_AGENT_ID
      : process.env.NEXT_ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) return fail(500, "Voice is not configured.");

  // A confirm session can save a result for its listing, so it is a call like any other:
  // it takes the one-per-minute slot, and /api/calls/result only accepts a result for a started call.
  let callId: string | null = null;
  if (agent === "confirm") {
    if (!isUuid(listingId) || !(await getCallTarget(listingId)))
      return fail(400, "Unknown listing.");
    callId = await claimCallSlot(listingId);
    if (!callId)
      return fail(429, "Another call is in progress. Try again in a minute.");
  }
  const failed = async () => {
    if (callId) await failCall(callId);
    return fail(502, "Could not start the call.");
  };

  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
  url.searchParams.set("agent_id", agentId);

  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    // The upstream body can echo account details; log the status only.
    if (!res.ok) {
      console.error(`ElevenLabs token request failed: ${res.status}`);
      return failed();
    }
    const { token } = (await res.json()) as { token?: unknown };
    if (typeof token !== "string" || !token) {
      console.error("ElevenLabs token reply had no token");
      return failed();
    }
    return Response.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("ElevenLabs token request threw");
    return failed();
  }
}
