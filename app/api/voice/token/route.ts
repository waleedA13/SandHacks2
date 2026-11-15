// Issues a short-lived ElevenLabs conversation token so the browser never sees
// the API key or the agent id. POST, not GET: with Cache Components a GET
// handler can be prerendered at build time and its response cached.
const fail = (status: number, error: string) =>
  Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) return fail(500, "Voice is not configured.");

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
      return fail(502, "Could not start the call.");
    }
    const { token } = (await res.json()) as { token?: unknown };
    if (typeof token !== "string" || !token) {
      console.error("ElevenLabs token reply had no token");
      return fail(502, "Could not start the call.");
    }
    return Response.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("ElevenLabs token request threw");
    return fail(502, "Could not start the call.");
  }
}
