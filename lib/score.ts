import type { Label, Tri } from "./types";

const points = (t: Tri, yes: number, no: number) => (t === "yes" ? yes : t === "no" ? no : 0);

export function scoreVerdict(
  v: { stillPractising: Tri; listsInsurer: Tri; acceptingNew: Tri },
  call?: { takesPlan: Tri; acceptingNew: Tri },
): { score: number; label: Label } {
  if (call?.takesPlan === "no" || call?.acceptingNew === "no") {
    return { score: 0, label: "Demo call: unavailable" };
  }
  if (call?.takesPlan === "yes" && call.acceptingNew === "yes") {
    return { score: 100, label: "Demo call: available" };
  }

  const raw =
    50 +
    points(v.stillPractising, 20, -30) +
    points(v.listsInsurer, 15, -25) +
    points(v.acceptingNew, 15, -25);
  const score = Math.min(100, Math.max(0, raw));
  const label: Label = score >= 70 ? "Likely available" : score >= 40 ? "Unclear" : "Likely dead end";
  return { score, label };
}
