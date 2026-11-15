import { describe, expect, it } from "vitest";
import { listingKey, normalizeName, normalizePhone } from "./normalize";

describe("normalizePhone", () => {
  it("keeps the 10 digits", () => {
    expect(normalizePhone("(619) 555-0142")).toBe("6195550142");
  });

  it("returns null when there is no full number", () => {
    expect(normalizePhone("ext 4")).toBeNull();
  });
});

describe("normalizeName", () => {
  it("ignores titles, credentials, case and punctuation", () => {
    expect(normalizeName("Dr. Ana Ruiz, LMFT")).toBe(normalizeName("ana ruiz"));
  });
});

describe("listingKey", () => {
  it("matches the same listing however it is written", () => {
    expect(
      listingKey("Cigna", "San Diego", "Dr. Ana Ruiz, LMFT", "(619) 555-0142"),
    ).toBe(listingKey("Cigna", "San Diego", "ana ruiz", "619-555-0142"));
  });

  // Telehealth groups list the same clinician at an office in each city.
  it("keeps one clinician's offices in two cities apart", () => {
    expect(
      listingKey("Cigna", "San Diego", "Robin Aquino", "(833) 646-3243"),
    ).not.toBe(
      listingKey("Cigna", "Sacramento", "Robin Aquino", "(833) 646-3243"),
    );
  });
});
