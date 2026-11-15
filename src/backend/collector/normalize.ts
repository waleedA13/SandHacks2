const CREDENTIALS = new Set([
  "dr",
  "phd",
  "psyd",
  "md",
  "edd",
  "lmft",
  "lcsw",
  "lpcc",
  "lpc",
  "lmhc",
  "mft",
  "msw",
  "ma",
  "ms",
  "mfti",
  "amft",
  "aswi",
  "acsw",
  "apcc",
  "ncc",
  "bcba",
  "psy",
  "jr",
  "sr",
]);

export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !CREDENTIALS.has(w))
    .join(" ");
}

/** One listing's identity, so a re-run updates instead of duplicating. City is part of it: telehealth groups list the same clinician at an office in each city. */
export const listingKey = (
  insurer: string,
  city: string,
  name: string,
  phone: string | null,
) =>
  `${insurer}|${city}|${normalizeName(name)}|${phone ? normalizePhone(phone) : ""}`;
