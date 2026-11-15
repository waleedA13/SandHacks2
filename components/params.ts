// A search param as one trimmed string, or undefined when missing or blank.
export const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
