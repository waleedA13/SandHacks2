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

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 10 ? `+1${digits}` : digits}`;
}
