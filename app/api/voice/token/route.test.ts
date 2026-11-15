import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
  vi.stubEnv("NEXT_ELEVENLABS_AGENT_ID", "agent_test_id");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("POST /api/voice/token", () => {
  it("returns only the conversation token, never the key or agent id", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ token: "tok_123", conversation_id: "conv_1" }),
    );

    const res = await POST();

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

      const res = await POST();

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Voice is not configured." });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("returns 502 without leaking the upstream body", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"detail":"invalid api key sk_test_key"}', { status: 401 }),
    );

    const res = await POST();
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ error: "Could not start the call." });
    expect(text).not.toContain("sk_test_key");
  });

  it("returns 502 when the upstream request throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const res = await POST();

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Could not start the call." });
  });

  it("returns 502 when the upstream reply has no token", async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    const res = await POST();

    expect(res.status).toBe(502);
  });
});
