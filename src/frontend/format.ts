export function checkedDate(iso: string) {
  if (!iso) return "not yet";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    // Every listed city is in California, so show the date people there see.
    timeZone: "America/Los_Angeles",
  });
}

// "$150 a session" or "$80 to $160 a session"; null when no fee is posted.
export function priceText(min: number | null, max: number | null) {
  const lo = min ?? max;
  const hi = max ?? min;
  if (lo == null) return null;
  return lo === hi ? `$${lo} a session` : `$${lo} to $${hi} a session`;
}

// Some verdicts give this as their whole reason; it says nothing worth repeating.
export const saysNoInfo = (reason?: string) =>
  /^we found no other information/i.test(reason?.trim() ?? "");

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 10 ? `+1${digits}` : digits}`;
}

// The plan most listings share, so one odd listing doesn't change the "Checked against" line.
export function commonPlan(plans: string[]) {
  const counts = new Map<string, number>();
  for (const p of plans) if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  let best = "";
  for (const [p, n] of counts) if (n > (counts.get(best) ?? 0)) best = p;
  return best;
}
