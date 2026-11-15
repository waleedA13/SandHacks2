import type { Label, Tri } from "./types";

const points = (t: Tri, yes: number, no: number) =>
  t === "yes" ? yes : t === "no" ? no : 0;

export function scoreVerdict(
  v: {
    stillPractising: Tri;
    listsInsurer: Tri;
    acceptingNew: Tri;
    seesSelfPay: Tri;
  },
  call?: { takesPlan: Tri; acceptingNew: Tri; source: "agent" | "caller" },
): { score: number; label: Label } {
  const who = call?.source === "caller" ? "Caller reported" : "Demo call";
  if (call?.takesPlan === "no" || call?.acceptingNew === "no") {
    return { score: 0, label: `${who}: unavailable` };
  }
  if (call?.takesPlan === "yes" && call.acceptingNew === "yes") {
    return { score: 100, label: `${who}: available` };
  }

  const raw =
    50 +
    points(v.stillPractising, 20, -30) +
    points(v.listsInsurer, 15, -25) +
    points(v.acceptingNew, 15, -25);
  const score = Math.min(100, Math.max(0, raw));
  // Not on the plan but sees self-pay clients: an option for someone who pays, not a dead end. Score stays, so sorting does too.
  if (
    v.listsInsurer === "no" &&
    v.seesSelfPay === "yes" &&
    v.stillPractising !== "no"
  )
    return { score, label: "Pay yourself" };
  const label: Label =
    score >= 70
      ? "Likely available"
      : score >= 40
        ? "Unclear"
        : "Likely dead end";
  return { score, label };
}
