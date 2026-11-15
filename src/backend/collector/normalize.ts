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
