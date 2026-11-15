// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceWidget } from "./VoiceWidget";

// The real SDK opens a microphone and a WebRTC connection; tests drive a fake.
const sdk = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: {} as Record<string, any>,
  status: "disconnected",
  mode: "listening",
  startSession: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({ children }: { children: ReactNode }) => children,
  useConversation: (opts: Record<string, unknown>) => {
    sdk.opts = opts;
    return {
      status: sdk.status,
      mode: sdk.mode,
      isSpeaking: sdk.mode === "speaking",
      startSession: sdk.startSession,
      endSession: sdk.endSession,
    };
  },
}));

const fetchMock = vi.fn();
const onDone = vi.fn();

const widget = () => (
  <VoiceWidget
    mode="confirm"
    listingId="l-1"
    name="Dr. Ana Ruiz"
    insurer="Aetna"
    onDone={onDone}
  />
);

beforeEach(() => {
  sdk.status = "disconnected";
  sdk.mode = "listening";
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const start = () => screen.getByRole("button", { name: /start demo call/i });
const stop = () => screen.getByRole("button", { name: /stop call/i });
const status = () => screen.getByRole("status");

describe("VoiceWidget", () => {
  it("always shows the demo-call notice and starts idle", () => {
    render(widget());

    expect(
      screen.getByText("Demo call. No real office was contacted."),
    ).toBeTruthy();
    expect(start().hasAttribute("disabled")).toBe(false);
    expect(stop().hasAttribute("disabled")).toBe(true);
    expect(status().textContent).toMatch(/ready/i);
  });

  it("gets a token from the app and starts the session with the listing details", async () => {
    fetchMock.mockResolvedValue(Response.json({ token: "tok_1" }));
    render(widget());

    fireEvent.click(start());

    await waitFor(() => expect(sdk.startSession).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/voice/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"agent":"confirm","listingId":"l-1"}',
    });
    expect(sdk.startSession).toHaveBeenCalledWith({
      conversationToken: "tok_1",
      connectionType: "webrtc",
      dynamicVariables: {
        listing_id: "l-1",
        therapist_name: "Dr. Ana Ruiz",
        insurer: "Aetna",
        connect_patient: "no",
        patient_number: "",
      },
    });
  });

  it("shows an error and does not start when the token request fails", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "Could not start the call." }, { status: 502 }),
    );
    render(widget());

    fireEvent.click(start());

    await waitFor(() =>
      expect(status().textContent).toMatch(/could not start/i),
    );
    expect(sdk.startSession).not.toHaveBeenCalled();
    expect(start().hasAttribute("disabled")).toBe(false);
  });

  it("announces listening and speaking while connected, and stops on request", () => {
    sdk.status = "connected";
    const { rerender } = render(widget());

    expect(status().textContent).toMatch(/listening/i);
    expect(start().hasAttribute("disabled")).toBe(true);

    sdk.mode = "speaking";
    rerender(widget());
    expect(status().textContent).toMatch(/speaking/i);

    fireEvent.click(stop());
    expect(sdk.endSession).toHaveBeenCalled();
  });

  it("lets Stop cancel a call that is still connecting", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(widget());

    fireEvent.click(start());
    expect(stop().hasAttribute("disabled")).toBe(false);
    expect(status().textContent).toMatch(/connecting/i);

    fireEvent.click(stop());
    expect(start().hasAttribute("disabled")).toBe(false);
  });

  it("shows the agent's last line", () => {
    sdk.status = "connected";
    render(widget());

    act(() => {
      sdk.opts.onMessage({ role: "user", message: "Yes we do." });
      sdk.opts.onMessage({ role: "agent", message: "Thanks, that's all." });
      sdk.opts.onMessage({ role: "user", message: "Bye." });
    });

    expect(screen.getByText("Thanks, that's all.")).toBeTruthy();
    expect(screen.queryByText("Bye.")).toBeNull();
  });

  it("passes the saved score to onDone when save_call_result returns", () => {
    render(widget());

    act(() => {
      // The plain event has no result; only the full payload carries it.
      sdk.opts.onAgentToolResponse({
        tool_name: "save_call_result",
        is_error: false,
      });
      sdk.opts.onAgentToolResponse({
        tool_name: "save_call_result",
        is_error: false,
        full_tool_result: '{"score":0,"label":"Demo call: unavailable"}',
      });
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith({
      score: 0,
      label: "Demo call: unavailable",
    });
    expect(status().textContent).toMatch(/Demo call: unavailable/);
  });

  it("ignores other tools and reports a failed save", () => {
    render(widget());

    act(() => {
      sdk.opts.onAgentToolResponse({
        tool_name: "end_call",
        is_error: false,
        full_tool_result: '{"score":1,"label":"x"}',
      });
    });
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      sdk.opts.onAgentToolResponse({
        tool_name: "save_call_result",
        is_error: true,
        full_tool_result: "401",
      });
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(status().textContent).toMatch(/could not be saved/i);

    act(() => {
      sdk.opts.onAgentToolResponse({
        tool_name: "save_call_result",
        is_error: false,
        full_tool_result: "not json",
      });
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(status().textContent).toMatch(/could not be saved/i);
  });
});

describe("VoiceWidget helper mode", () => {
  const helper = () => <VoiceWidget mode="helper" />;
  const startTalking = () =>
    screen.getByRole("button", { name: /start talking/i });

  it("shows the public-web-pages notice instead of the demo-call notice", () => {
    render(helper());

    expect(screen.getByRole("region", { name: /ask out loud/i })).toBeTruthy();
    expect(
      screen.getByText(
        "Answers come from public web pages. Only the office can confirm.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/demo call/i)).toBeNull();
    expect(startTalking().hasAttribute("disabled")).toBe(false);
    expect(
      screen
        .getByRole("button", { name: /end conversation/i })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(status().textContent).toMatch(/ready/i);
  });

  it("asks for a helper token and starts without listing variables", async () => {
    fetchMock.mockResolvedValue(Response.json({ token: "tok_h" }));
    render(helper());

    fireEvent.click(startTalking());

    await waitFor(() => expect(sdk.startSession).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/voice/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"agent":"helper"}',
    });
    expect(sdk.startSession).toHaveBeenCalledWith({
      conversationToken: "tok_h",
      connectionType: "webrtc",
    });
  });

  it("shows what the assistant last said and ignores tool results", () => {
    sdk.status = "connected";
    render(helper());

    act(() => {
      sdk.opts.onMessage({
        role: "agent",
        message: "Avery Example. 6 1 9, 5 5 5, 0 1 0 0.",
      });
      sdk.opts.onAgentToolResponse?.({
        tool_name: "find_therapists",
        is_error: true,
      });
    });

    expect(
      screen.getByText("Avery Example. 6 1 9, 5 5 5, 0 1 0 0."),
    ).toBeTruthy();
    expect(status().textContent).toMatch(/listening/i);
  });
});
