// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Listing } from "@/shared/types";
import { BookingPanel, planToAsk } from "./BookingPanel";
import { LabelProvider, LiveBadge } from "./CallPanel";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
// The server action reaches the database; the JavaScript path never calls it.
vi.mock("@/app/listing/[id]/actions", () => ({ sendReport: vi.fn() }));
vi.mock("./VoiceWidget", () => ({ VoiceWidget: () => <p>Voice widget</p> }));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

const LISTING: Listing = {
  id: "00000000-0000-4000-8000-000000000006",
  insurer: "Aetna",
  plan: "Aetna Open Access",
  city: "San Diego",
  state: "CA",
  name: "Quinn Sample",
  credential: "PhD",
  address: null,
  phone: "(619) 555-0106",
  npi: null,
  sourceUrl: "https://example.com/directory/6",
  scrapedAt: "2026-11-14T00:00:00Z",
  bookingUrl: null,
  bookingSource: null,
  phoneLineType: "mobile",
};

function renderPanel(
  paths: Parameters<typeof BookingPanel>[0]["paths"],
  listing = LISTING,
) {
  render(
    <LabelProvider>
      <LiveBadge label="Unclear" />
      <BookingPanel listing={listing} paths={paths} lastCall={null} />
    </LabelProvider>,
  );
}

function answer(group: string, choice: string) {
  fireEvent.click(
    within(screen.getByRole("group", { name: group })).getByLabelText(choice, {
      exact: true,
    }),
  );
}

it("shows the paths in order", () => {
  renderPanel(["book_online", "agent_check", "call_yourself"], {
    ...LISTING,
    bookingUrl: "https://example.com/book/x",
    bookingSource: "zocdoc",
    phoneLineType: "landline",
  });
  expect(
    screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
  ).toEqual(["Book online", "Ask the assistant", "Call yourself"]);
  const book = screen.getByRole("link", { name: /Book online with Zocdoc/ });
  expect(book.getAttribute("target")).toBe("_blank");
  expect(book.getAttribute("rel")).toBe("noopener noreferrer");
  expect(
    screen.getByText(/Check the booking says it takes Aetna Open Access\./),
  ).toBeTruthy();
});

it("a mobile listing gets the script and no assistant", () => {
  renderPanel(["call_yourself"]);
  expect(screen.queryByText("Voice widget")).toBeNull();
  expect(
    screen
      .getByRole("link", { name: "Call (619) 555-0106" })
      .getAttribute("href"),
  ).toBe("tel:+16195550106");
  expect(
    screen.getByText(/Do you take Aetna Open Access\?/).textContent,
  ).not.toMatch(/Aetna Aetna/);
  expect(
    screen.getByText(/Is Quinn Sample taking new patients\?/),
  ).toBeTruthy();
});

it("says so when there is no way to contact", () => {
  renderPanel([]);
  expect(screen.getByText("No way to contact listed.")).toBeTruthy();
});

it("sends the report to the API and swaps the badge", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ score: 0, label: "Caller reported: unavailable" }),
    );
  vi.stubGlobal("fetch", fetchMock);
  renderPanel(["call_yourself"]);

  answer("Did they answer?", "Yes");
  answer("Are they taking new patients?", "No");
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByText("Caller reported: unavailable")).toBeTruthy();
  expect(screen.queryByText("Unclear")).toBeNull();
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/listings/${LISTING.id}/report`,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ answered: "yes", acceptingNew: "no" }),
    }),
  );
  expect(refresh).toHaveBeenCalledOnce();
});

it("sends unknown when nobody answered", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ score: 50, label: "Unclear" }));
  vi.stubGlobal("fetch", fetchMock);
  renderPanel(["call_yourself"]);

  answer("Did they answer?", "Yes");
  answer("Are they taking new patients?", "Yes");
  answer("Did they answer?", "No");
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByText(/Thanks\. Your report is saved/)).toBeTruthy();
  expect(fetchMock.mock.calls[0][1].body).toBe(
    JSON.stringify({ answered: "no", acceptingNew: "unknown" }),
  );
});

it("asks to wait after a second report inside a minute", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ error: "x" }, { status: 429 })),
  );
  renderPanel(["call_yourself"]);
  answer("Did they answer?", "No");
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(
    await screen.findByText(
      "Thanks, we already have a report for this listing. Try again in a minute.",
    ),
  ).toBeTruthy();
  expect(refresh).not.toHaveBeenCalled();
});

it("does not repeat the insurer when the plan already names it", () => {
  expect(planToAsk("Aetna", "Aetna Open Access")).toBe("Aetna Open Access");
  expect(planToAsk("Aetna", "Open Access")).toBe("Aetna Open Access");
});
