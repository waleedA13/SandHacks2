// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GIVE_UP_MS, POLL_MS, RecheckButton } from "./RecheckButton";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ID = "00000000-0000-4000-8000-000000000002";
const CHECKED = "2026-11-14T20:00:00Z";
const CHECKING = "Checking now. This takes about a minute.";
const FAILED =
  "We couldn't check right now. Showing the last result from Nov 14, 2026.";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

// Answers the recheck POST with a job, then each poll with the next status in turn.
function serve(...statuses: string[]) {
  const fetch = vi.fn((url: string) =>
    url.endsWith("/recheck")
      ? json({ jobId: "job-1" })
      : json({ status: statuses.shift() ?? "running" }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const status = () => screen.getByRole("status");
const button = () => screen.getByRole("button");
const poll = () => act(() => vi.advanceTimersByTimeAsync(POLL_MS));

beforeEach(() => {
  vi.useFakeTimers();
  render(<RecheckButton listingId={ID} checkedAt={CHECKED} />);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

it("is quiet until pressed", () => {
  expect(button()).toHaveProperty("textContent", "Check again now");
  expect(status().textContent).toBe("");
  expect(status().getAttribute("aria-live")).toBe("polite");
});

it("polls queued, running, done, then refreshes the page", async () => {
  const fetch = serve("queued", "running", "done");
  await act(async () => fireEvent.click(button()));

  expect(fetch).toHaveBeenCalledWith(
    `/api/listings/${ID}/recheck`,
    expect.objectContaining({ method: "POST" }),
  );
  expect(status().textContent).toBe(CHECKING);
  expect(button().getAttribute("aria-disabled")).toBe("true");

  await poll();
  await poll();
  expect(refresh).not.toHaveBeenCalled();
  expect(status().textContent).toBe(CHECKING);

  await poll();
  expect(fetch).toHaveBeenLastCalledWith("/api/jobs/job-1", expect.anything());
  expect(refresh).toHaveBeenCalledOnce();
  expect(status().textContent).toBe("Done. The result above is new.");
  expect(button().getAttribute("aria-disabled")).toBe("false");
});

it("says so when the job fails", async () => {
  serve("running", "failed");
  await act(async () => fireEvent.click(button()));
  await poll();
  await poll();
  expect(status().textContent).toBe(FAILED);
  expect(refresh).not.toHaveBeenCalled();
});

it("says so on a network error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("offline"))),
  );
  await act(async () => fireEvent.click(button()));
  expect(status().textContent).toBe(FAILED);
});

it("gives up after 120 seconds", async () => {
  const fetch = serve();
  await act(async () => fireEvent.click(button()));
  await act(() => vi.advanceTimersByTimeAsync(GIVE_UP_MS - POLL_MS));
  expect(status().textContent).toBe(CHECKING);

  await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
  expect(status().textContent).toBe(FAILED);
  // One POST and one poll every 2 seconds, then no more.
  const calls = fetch.mock.calls.length;
  await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 5));
  expect(fetch.mock.calls.length).toBe(calls);
  expect(refresh).not.toHaveBeenCalled();
});

it("sends one POST for a double press", async () => {
  const fetch = serve();
  await act(async () => {
    fireEvent.click(button());
    fireEvent.click(button());
  });
  await act(async () => fireEvent.click(button()));
  const posts = fetch.mock.calls.filter(([url]) => url.endsWith("/recheck"));
  expect(posts).toHaveLength(1);
});

it("stops polling when the page is left", async () => {
  const fetch = serve();
  await act(async () => fireEvent.click(button()));
  cleanup();
  const calls = fetch.mock.calls.length;
  await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 5));
  expect(fetch.mock.calls.length).toBe(calls);
});
