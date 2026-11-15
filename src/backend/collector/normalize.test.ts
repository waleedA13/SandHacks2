import { describe, expect, it } from "vitest";
import { normalizeName, normalizePhone } from "./normalize";

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
