import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupLineType } from "./linetype";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function answer(type: string | null) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Response.json({
      line_type_intelligence: { type, error_code: null },
    });
  });
  return calls;
}

describe("lookupLineType", () => {
  it.each([
    ["landline", "landline"],
    ["mobile", "mobile"],
    ["fixedVoip", "voip"],
    ["nonFixedVoip", "voip"],
    ["tollFree", "unknown"],
    [null, "unknown"],
  ])("maps Twilio's %s to %s", async (type, expected) => {
    answer(type);
    expect(await lookupLineType("(619) 555-0101")).toBe(expected);
  });

  it("asks Twilio for the E.164 number with the API key", async () => {
    vi.stubEnv("TWILIO_API_KEY_SID", "SKabc");
    vi.stubEnv("TWILIO_API_KEY_SECRET", "secret");
    const calls = answer("landline");
    await lookupLineType("619-555-0101");
    expect(calls[0].url).toBe(
      "https://lookups.twilio.com/v2/PhoneNumbers/%2B16195550101?Fields=line_type_intelligence",
    );
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe(
      `Basic ${btoa("SKabc:secret")}`,
    );
  });

  it("returns unknown when Twilio answers with an error", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 401 }));
    expect(await lookupLineType("(619) 555-0101")).toBe("unknown");
  });

  it("returns unknown when Twilio cannot be reached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    expect(await lookupLineType("(619) 555-0101")).toBe("unknown");
  });

  it("returns unknown without calling Twilio for a number it can't read", async () => {
    const calls = answer("landline");
    expect(await lookupLineType("ext 12")).toBe("unknown");
    expect(calls).toHaveLength(0);
  });
});
