import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimCallSlot, failCall, getCallTarget } from "@/backend/queries";
import { POST } from "./route";

// The database is mocked here; lib/queries.int.test.ts covers the real queries.
vi.mock("@/backend/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/backend/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/backend/queries")>()),
  getCallTarget: vi.fn(),
  claimCallSlot: vi.fn(),
  failCall: vi.fn(),
}));

const fetchMock = vi.fn();
const LISTING = "00000000-0000-4000-8000-000000000001";
const TEAMMATE = "+16195550123";
const OTHER_TEAMMATE = "+16195550188";
// The fixture office's own number. It must never be dialled.
const OFFICE = "(619) 555-0101";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/calls/start", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
  vi.stubEnv("NEXT_ELEVENLABS_AGENT_ID", "agent_test_id");
  vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "phnum_test_id");
  vi.stubEnv("DEMO_CALL_ALLOWLIST", `${TEAMMATE}, ${OTHER_TEAMMATE}`);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getCallTarget).mockResolvedValue({
    name: "Avery Example",
    insurer: "Aetna",
    optedOut: false,
    lineType: "landline",
  });
  vi.mocked(claimCallSlot).mockResolvedValue("call_row_id");
  fetchMock.mockResolvedValue(
    Response.json({
      success: true,
      message: "ok",
      conversation_id: "conv_1",
      callSid: "CA123",
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.mocked(getCallTarget).mockReset();
  vi.mocked(claimCallSlot).mockReset();
  vi.mocked(failCall).mockReset();
  fetchMock.mockReset();
});

describe("POST /api/calls/start", () => {
  it("dials an allow-listed number with the confirm agent and returns only the call ids", async () => {
    const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      callSid: "CA123",
      conversationId: "conv_1",
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(claimCallSlot).toHaveBeenCalledWith(LISTING);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "xi-api-key": "sk_test_key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      agent_id: "agent_test_id",
      agent_phone_number_id: "phnum_test_id",
      to_number: TEAMMATE,
      conversation_initiation_client_data: {
        dynamic_variables: {
          listing_id: LISTING,
          therapist_name: "Avery Example",
          insurer: "Aetna",
          connect_patient: "no",
          patient_number: "",
        },
      },
    });
  });

  it("accepts formatting that normalises to a listed number and dials the normalised form", async () => {
    const res = await post({
      listingId: LISTING,
      toNumber: "+1 (619) 555.01-23",
    });

    expect(res.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to_number).toBe(
      TEAMMATE,
    );
  });

  describe("refuses with 403 and places no call", () => {
    it.each([
      ["a number not on the list", "+14155550000"],
      ["the listing's own office phone", OFFICE],
      ["the office phone in E.164", "+16195550101"],
      ["a near-miss, one digit off", "+16195550124"],
      ["a listed number missing a digit", "+1619555012"],
      ["a listed number with an extra digit", "+161955501234"],
      ["a listed number without the plus", "16195550123"],
      ["a listed number without the country code", "6195550123"],
      ["two numbers smuggled in one string", `${TEAMMATE},+14155550000`],
      ["two numbers joined by a space", `${TEAMMATE} ${OTHER_TEAMMATE}`],
      ["a listed number with trailing text", `${TEAMMATE}x`],
      ["an empty string", ""],
    ])("%s", async (_, toNumber) => {
      const res = await post({ listingId: LISTING, toNumber });

      expect(res.status).toBe(403);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(claimCallSlot).not.toHaveBeenCalled();
    });

    it.each([
      ["empty", "", TEAMMATE],
      ["only commas and spaces", " , ,", TEAMMATE],
      [
        "an entry that is not E.164, even sent verbatim",
        "6195550123",
        "6195550123",
      ],
    ])("every number when the allow-list is %s", async (_, list, toNumber) => {
      vi.stubEnv("DEMO_CALL_ALLOWLIST", list);

      const res = await post({ listingId: LISTING, toNumber });

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("every number when the allow-list is missing", async () => {
      vi.stubEnv("DEMO_CALL_ALLOWLIST", undefined);

      const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["not JSON", "{"],
    ["an array", [LISTING, TEAMMATE]],
    ["a non-UUID listingId", { listingId: "abc", toNumber: TEAMMATE }],
    ["a missing toNumber", { listingId: LISTING }],
    ["a numeric toNumber", { listingId: LISTING, toNumber: 16195550123 }],
    [
      "a numeric connectTo",
      { listingId: LISTING, toNumber: TEAMMATE, connectTo: 16195550188 },
    ],
  ])("returns 400 for %s", async (_, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the listing does not exist", async () => {
    vi.mocked(getCallTarget).mockResolvedValue(null);

    const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(claimCallSlot).not.toHaveBeenCalled();
  });

  it("returns 403 and places no call when the office asked not to be called", async () => {
    vi.mocked(getCallTarget).mockResolvedValue({
      name: "Avery Example",
      insurer: "Aetna",
      optedOut: true,
      lineType: "landline",
    });

    const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "This office asked not to be called.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(claimCallSlot).not.toHaveBeenCalled();
  });

  it.each(["mobile", "voip", "unknown"] as const)(
    "returns 403 for a %s office line, even with an allow-listed number",
    async (lineType) => {
      vi.mocked(getCallTarget).mockResolvedValue({
        name: "Avery Example",
        insurer: "Aetna",
        optedOut: false,
        lineType,
      });

      const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "We only place assistant calls to office landlines.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(claimCallSlot).not.toHaveBeenCalled();
    },
  );

  it("ignores a lineType sent in the body: only the listing's line type counts", async () => {
    vi.mocked(getCallTarget).mockResolvedValue({
      name: "Avery Example",
      insurer: "Aetna",
      optedOut: false,
      lineType: "mobile",
    });

    const res = await post({
      listingId: LISTING,
      toNumber: TEAMMATE,
      lineType: "landline",
      phoneLineType: "landline",
    });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 429 when another call started in the last 60 seconds", async () => {
    vi.mocked(claimCallSlot).mockResolvedValue(null);

    const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "ELEVENLABS_API_KEY",
    "NEXT_ELEVENLABS_AGENT_ID",
    "ELEVENLABS_PHONE_NUMBER_ID",
  ])("returns a generic 500 when %s is missing", async (name) => {
    vi.stubEnv(name, "");

    const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Phone calls are not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("upstream failure returns a generic 502 and frees the slot", () => {
    it.each([
      [
        "an error status",
        () =>
          new Response('{"detail":"bad key sk_test_key phnum_test_id"}', {
            status: 401,
          }),
      ],
      [
        "success false",
        () =>
          Response.json({ success: false, message: "sk_test_key exhausted" }),
      ],
      ["no call ids", () => Response.json({ success: true })],
    ])("%s", async (_, reply) => {
      fetchMock.mockResolvedValue(reply());

      const res = await post({ listingId: LISTING, toNumber: TEAMMATE });
      const text = await res.text();

      expect(res.status).toBe(502);
      expect(JSON.parse(text)).toEqual({ error: "Could not place the call." });
      expect(text).not.toContain("sk_test_key");
      expect(failCall).toHaveBeenCalledWith("call_row_id");
    });

    it("a thrown request", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));

      const res = await post({ listingId: LISTING, toNumber: TEAMMATE });

      expect(res.status).toBe(502);
      expect(failCall).toHaveBeenCalledWith("call_row_id");
    });
  });

  describe("connectTo: ring the patient after a yes/yes check", () => {
    // The patient's number in every form a leak could take.
    const PATIENT = OTHER_TEAMMATE;
    const leaks = (text: string) => /619\D{0,2}555\D?0188/.test(text);
    const logged = () =>
      JSON.stringify(
        (["log", "info", "warn", "error", "debug"] as const).flatMap(
          (m) => vi.mocked(console[m]).mock?.calls ?? [],
        ),
      );
    const dbArgs = () =>
      JSON.stringify([
        vi.mocked(getCallTarget).mock.calls,
        vi.mocked(claimCallSlot).mock.calls,
        vi.mocked(failCall).mock.calls,
      ]);

    beforeEach(() => {
      for (const m of ["log", "info", "warn", "debug"] as const)
        vi.spyOn(console, m).mockImplementation(() => {});
    });

    it("hands the normalised number to the agent only, never to the response, logs or database", async () => {
      const res = await post({
        listingId: LISTING,
        toNumber: TEAMMATE,
        connectTo: "+1 (619) 555-0188",
      });
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(JSON.parse(text)).toEqual({
        ok: true,
        callSid: "CA123",
        conversationId: "conv_1",
      });
      const vars = JSON.parse(fetchMock.mock.calls[0][1].body)
        .conversation_initiation_client_data.dynamic_variables;
      expect(vars.connect_patient).toBe("yes");
      expect(vars.patient_number).toBe(PATIENT);
      expect(leaks(text)).toBe(false);
      expect(leaks(logged())).toBe(false);
      expect(leaks(dbArgs())).toBe(false);
    });

    it.each([
      ["a number not on the list", "+14155550000"],
      ["the listing's own office phone", OFFICE],
      ["the number being called as the office", TEAMMATE],
      ["an empty string", ""],
    ])("refuses %s with 403 and places no call", async (_, connectTo) => {
      const res = await post({
        listingId: LISTING,
        toNumber: TEAMMATE,
        connectTo,
      });
      const text = await res.text();

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(claimCallSlot).not.toHaveBeenCalled();
      expect(text).not.toMatch(/\d{3}\D?\d{4}/);
    });

    it.each(["mobile", "voip", "unknown"] as const)(
      "refuses a %s office line with 403",
      async (lineType) => {
        vi.mocked(getCallTarget).mockResolvedValue({
          name: "Avery Example",
          insurer: "Aetna",
          optedOut: false,
          lineType,
        });

        const res = await post({
          listingId: LISTING,
          toNumber: TEAMMATE,
          connectTo: PATIENT,
        });

        expect(res.status).toBe(403);
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("keeps the number out of the 502 and its log when ElevenLabs refuses", async () => {
      fetchMock.mockResolvedValue(
        new Response(`{"detail":"cannot dial ${PATIENT}"}`, { status: 400 }),
      );

      const res = await post({
        listingId: LISTING,
        toNumber: TEAMMATE,
        connectTo: PATIENT,
      });

      expect(res.status).toBe(502);
      expect(leaks(await res.text())).toBe(false);
      expect(leaks(logged())).toBe(false);
      expect(leaks(dbArgs())).toBe(false);
    });
  });
});
