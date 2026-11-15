import { describe, expect, it } from "vitest";
import { scoreVerdict } from "./score";
import type { Tri } from "./types";

const web = (stillPractising: Tri, listsInsurer: Tri, acceptingNew: Tri) => ({
  stillPractising,
  listsInsurer,
  acceptingNew,
});

describe("scoreVerdict from web evidence", () => {
  it("scores all unknown as 50, Unclear", () => {
    expect(scoreVerdict(web("unknown", "unknown", "unknown"))).toEqual({
      score: 50,
      label: "Unclear",
    });
  });

  it("scores all yes as 100, Likely available", () => {
    expect(scoreVerdict(web("yes", "yes", "yes"))).toEqual({
      score: 100,
      label: "Likely available",
    });
  });

  it("scores all no as 0, Likely dead end", () => {
    expect(scoreVerdict(web("no", "no", "no"))).toEqual({
      score: 0,
      label: "Likely dead end",
    });
  });

  it("scores yes, yes, unknown as 85", () => {
    expect(scoreVerdict(web("yes", "yes", "unknown")).score).toBe(85);
  });

  it("labels 70 as Likely available and 69 or below as Unclear", () => {
    // yes, unknown, unknown = 70; unknown, yes, unknown = 65
    expect(scoreVerdict(web("yes", "unknown", "unknown")).label).toBe(
      "Likely available",
    );
    expect(scoreVerdict(web("unknown", "yes", "unknown")).label).toBe(
      "Unclear",
    );
  });

  it("labels below 40 as Likely dead end", () => {
    // no, unknown, unknown = 20
    expect(scoreVerdict(web("no", "unknown", "unknown"))).toEqual({
      score: 20,
      label: "Likely dead end",
    });
  });
});

describe("scoreVerdict with a demo call", () => {
  it("gives 100, Demo call: available, when the call says yes to both", () => {
    expect(
      scoreVerdict(web("no", "no", "no"), {
        takesPlan: "yes",
        acceptingNew: "yes",
      }),
    ).toEqual({
      score: 100,
      label: "Demo call: available",
    });
  });

  it("gives 0, Demo call: unavailable, when the call says no to either", () => {
    const unavailable = { score: 0, label: "Demo call: unavailable" };
    expect(
      scoreVerdict(web("yes", "yes", "yes"), {
        takesPlan: "no",
        acceptingNew: "yes",
      }),
    ).toEqual(unavailable);
    expect(
      scoreVerdict(web("yes", "yes", "yes"), {
        takesPlan: "yes",
        acceptingNew: "no",
      }),
    ).toEqual(unavailable);
  });

  it("keeps the web score when the call has an unknown and no no", () => {
    const v = web("yes", "yes", "unknown");
    expect(
      scoreVerdict(v, { takesPlan: "unknown", acceptingNew: "yes" }),
    ).toEqual(scoreVerdict(v));
  });
});
