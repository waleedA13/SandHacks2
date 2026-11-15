// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CallPanel, LabelProvider, LiveBadge } from "./CallPanel";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

// The real widget needs a microphone; this fake ends the call with "we're full".
vi.mock("./VoiceWidget", () => ({
  VoiceWidget: ({
    onDone,
  }: {
    onDone: (r: { score: number; label: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onDone({ score: 0, label: "Demo call: unavailable" })}
    >
      Finish fake call
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

type Props = Parameters<typeof CallPanel>[0];

function renderPage(lastCall: Props["lastCall"], paths?: Props["paths"]) {
  render(
    <LabelProvider>
      <LiveBadge label="Likely available" />
      <CallPanel
        listingId="00000000-0000-4000-8000-000000000001"
        name="Avery Example"
        insurer="Aetna"
        lastCall={lastCall}
        paths={paths}
      />
    </LabelProvider>,
  );
}

it("swaps the badge in a live region and refreshes when the call ends", () => {
  renderPage(null);
  expect(screen.getByText("Likely available")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Finish fake call" }));

  const badge = screen.getByText("Demo call: unavailable");
  expect(badge.closest("[aria-live=polite]")).toBeTruthy();
  expect(screen.queryByText("Likely available")).toBeNull();
  expect(refresh).toHaveBeenCalledOnce();
});

it("shows an earlier call above the widget", () => {
  renderPage({
    summary: "Demo call: they take Aetna and have openings.",
    calledAt: "2026-11-14T20:00:00.000Z",
  });
  expect(
    screen.getByText(
      "Demo call on Nov 14, 2026: they take Aetna and have openings.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("No real office was contacted.")).toBeTruthy();
});

describe("Check and connect me", () => {
  const LISTING = "00000000-0000-4000-8000-000000000001";

  function open() {
    renderPage(null, ["agent_check", "call_yourself"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Check and connect me" }),
    );
    fireEvent.change(screen.getByLabelText("Office number for the demo"), {
      target: { value: "+16195550123" },
    });
    fireEvent.change(screen.getByLabelText("Your phone number"), {
      target: { value: "+16195550188" },
    });
  }

  const submit = () =>
    fireEvent.click(screen.getByRole("button", { name: "Start the call" }));

  it.each([
    ["no paths", undefined],
    ["a mobile office", ["call_yourself"] as Props["paths"]],
    [
      "a booking page and a mobile",
      ["book_online", "call_yourself"] as Props["paths"],
    ],
  ])("is not offered for %s", (_, paths) => {
    renderPage(null, paths);
    expect(
      screen.queryByRole("button", { name: "Check and connect me" }),
    ).toBeNull();
  });

  it("opens a labelled form and starts nothing without the consent tick", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    open();

    expect(
      screen
        .getByRole("button", { name: "Check and connect me" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    const consent = screen.getByRole("checkbox", {
      name: "Call me at this number and connect me to the office. The assistant will leave once you're connected.",
    });
    expect((consent as HTMLInputElement).checked).toBe(false);
    submit();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts the call with both numbers, then forgets the patient's number", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ ok: true, callSid: "CA1", conversationId: "c1" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    open();
    fireEvent.click(screen.getByRole("checkbox"));
    submit();

    expect(
      await screen.findByText(
        "Calling the office. If they say yes to both questions, your phone will ring.",
      ),
    ).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/calls/start");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      listingId: LISTING,
      toNumber: "+16195550123",
      connectTo: "+16195550188",
    });
    expect(
      (screen.getByLabelText("Your phone number") as HTMLInputElement).value,
    ).toBe("");
  });

  it.each([
    [
      403,
      { error: "Your number is not on the demo allow-list." },
      "Your number is not on the demo allow-list.",
    ],
    [
      429,
      { error: "x" },
      "A call started less than a minute ago. Try again shortly.",
    ],
    [502, { error: "x" }, "Could not start the call. Try again in a moment."],
  ])("shows a plain message for a %i", async (status, body, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(body, { status })),
    );
    open();
    fireEvent.click(screen.getByRole("checkbox"));
    submit();

    expect(await screen.findByText(message)).toBeTruthy();
  });
});
