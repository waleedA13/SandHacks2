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

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 10 ? `+1${digits}` : digits}`;
}
