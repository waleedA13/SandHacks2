import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimCallSlot, failCall } from "@/backend/queries";
import { POST } from "./route";

const LID = "00000000-0000-4000-8000-000000000001";

// The database is not used in unit tests: a known listing and a free call slot.
vi.mock("@/backend/queries", () => ({
  isUuid: (s: unknown) => typeof s === "string" && /^[0-9a-f-]{36}$/.test(s),
  getCallTarget: vi.fn(async (id: string) =>
    id === LID ? { name: "Ana", insurer: "Aetna" } : null,
  ),
  claimCallSlot: vi.fn(async () => "call-1"),
  failCall: vi.fn(async () => {}),
}));

const fetchMock = vi.fn();
const CONFIRM = JSON.stringify({ agent: "confirm", listingId: LID });

// The widget sends { agent: "confirm", listingId } or { agent: "helper" }.
const post = (body: string | undefined = CONFIRM) =>
  POST(
    new Request("http://localhost/api/voice/token", { method: "POST", body }),
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
  vi.stubEnv("NEXT_ELEVENLABS_AGENT_ID", "agent_test_id");
  vi.stubEnv("NEXT_ELEVENLABS_HELPER_AGENT_ID", "agent_helper_id");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe("POST /api/voice/token", () => {
  it("returns only the conversation token, never the key or agent id", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ token: "tok_123", conversation_id: "conv_1" }),
    );

    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "tok_123" });
    expect(res.headers.get("cache-control")).toBe("no-store");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_test_id",
    );
    expect(init.headers).toEqual({ "xi-api-key": "sk_test_key" });
  });

  it.each(["ELEVENLABS_API_KEY", "NEXT_ELEVENLABS_AGENT_ID"])(
    "returns 500 with a generic message when %s is missing",
    async (name) => {
      vi.stubEnv(name, "");

      const res = await post();

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Voice is not configured." });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("returns 502 without leaking the upstream body", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"detail":"invalid api key sk_test_key"}', { status: 401 }),
    );

    const res = await post();
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ error: "Could not start the call." });
    expect(text).not.toContain("sk_test_key");
  });

  it("returns 502 when the upstream request throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const res = await post();

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Could not start the call." });
  });

  it("returns 502 when the upstream reply has no token", async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    const res = await post();

    expect(res.status).toBe(502);
  });
});

describe("POST /api/voice/token agent choice", () => {
  const tokenUrl = (id: string) =>
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${id}`;

  it.each([
    ["confirm", CONFIRM, "agent_test_id"],
    ["helper", '{"agent":"helper"}', "agent_helper_id"],
  ])("uses the right agent id for %s", async (_, body, id) => {
    fetchMock.mockResolvedValue(Response.json({ token: "tok_123" }));

    const res = await post(body);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "tok_123" });
    expect(String(fetchMock.mock.calls[0][0])).toBe(tokenUrl(id));
  });

  it.each([
    '{"agent":"admin"}',
    '{"agent":"toString"}',
    '{"agent":["helper"]}',
    '{"agent":null}',
    "null",
    "[]",
    "not json",
  ])("returns 400 and calls nothing for %s", async (body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "Unknown voice agent." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["no body", ""],
    ["an empty object", "{}"],
    ["confirm without a listing", '{"agent":"confirm"}'],
    ["a malformed listing id", '{"agent":"confirm","listingId":"x"}'],
    [
      "an unknown listing",
      '{"agent":"confirm","listingId":"00000000-0000-4000-8000-000000000999"}',
    ],
  ])("returns 400 and calls nothing for %s", async (_, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown listing." });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(claimCallSlot).not.toHaveBeenCalled();
  });

  it("returns 429 while another call holds the slot", async () => {
    vi.mocked(claimCallSlot).mockResolvedValueOnce(null);

    const res = await post();

    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("frees the slot when ElevenLabs refuses", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 500 }));

    expect((await post()).status).toBe(502);
    expect(failCall).toHaveBeenCalledWith("call-1");
  });

  it("starts no call for the helper", async () => {
    fetchMock.mockResolvedValue(Response.json({ token: "tok_123" }));

    await post('{"agent":"helper"}');

    expect(claimCallSlot).not.toHaveBeenCalled();
  });

  it("returns 500 when the helper agent id is missing", async () => {
    vi.stubEnv("NEXT_ELEVENLABS_HELPER_AGENT_ID", "");

    const res = await post('{"agent":"helper"}');

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Voice is not configured." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
