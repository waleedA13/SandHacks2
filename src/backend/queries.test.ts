import { describe, expect, it, vi } from "vitest";
import { bookingPaths } from "./queries";

vi.mock("@/backend/db/client", () => ({ sql: vi.fn() }));

const link = "https://example.com/book";

describe("bookingPaths", () => {
  it.each([
    [
      "a link and a landline",
      { bookingUrl: link, phone: "(619) 555-0101", phoneLineType: "landline" },
      ["book_online", "agent_check", "call_yourself"],
    ],
    [
      "a landline only",
      { bookingUrl: null, phone: "(619) 555-0101", phoneLineType: "landline" },
      ["agent_check", "call_yourself"],
    ],
    [
      "a mobile",
      { bookingUrl: null, phone: "(619) 555-0101", phoneLineType: "mobile" },
      ["call_yourself"],
    ],
    [
      "a voip line with a link",
      { bookingUrl: link, phone: "(619) 555-0101", phoneLineType: "voip" },
      ["book_online", "call_yourself"],
    ],
    [
      "an unknown line",
      { bookingUrl: null, phone: "(619) 555-0101", phoneLineType: "unknown" },
      ["call_yourself"],
    ],
    [
      "a landline type but no phone",
      { bookingUrl: null, phone: null, phoneLineType: "landline" },
      [],
    ],
    [
      "a link and no phone",
      { bookingUrl: link, phone: null, phoneLineType: "unknown" },
      ["book_online"],
    ],
    [
      "no phone and no link",
      { bookingUrl: null, phone: null, phoneLineType: "unknown" },
      [],
    ],
  ] as const)("%s", (_, listing, paths) => {
    expect(bookingPaths(listing)).toEqual(paths);
  });
});
