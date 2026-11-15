import { describe, expect, it } from "vitest";
import { commonPlan, priceText } from "./format";

describe("priceText", () => {
  it("shows one price or a range", () => {
    expect(priceText(150, 150)).toBe("$150 a session");
    expect(priceText(80, 160)).toBe("$80 to $160 a session");
    expect(priceText(null, 120)).toBe("$120 a session");
  });

  it("is null with no fee", () => {
    expect(priceText(null, null)).toBeNull();
  });
});

describe("commonPlan", () => {
  it("picks the plan most listings share", () => {
    expect(commonPlan(["Open Access", "PPO", "Open Access"])).toBe(
      "Open Access",
    );
  });

  it("is empty with no plans", () => {
    expect(commonPlan([])).toBe("");
    expect(commonPlan([""])).toBe("");
  });
});
