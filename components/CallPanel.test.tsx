// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
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
});

function renderPage(lastCall: Parameters<typeof CallPanel>[0]["lastCall"]) {
  render(
    <LabelProvider>
      <LiveBadge label="Likely available" />
      <CallPanel
        listingId="00000000-0000-4000-8000-000000000001"
        name="Avery Example"
        insurer="Aetna"
        lastCall={lastCall}
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
