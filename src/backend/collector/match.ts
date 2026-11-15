import { normalizeName as normalize, normalizePhone } from "./normalize";

// Directories list middle initials that pages usually leave out.
export const normalizeName = (raw: string) =>
  normalize(raw)
    .split(" ")
    .filter((w) => w.length > 1)
    .join(" ");

export function isSamePerson(
  listing: {
    name: string;
    phone: string | null;
    city: string;
    nameIsUnique: boolean;
    licenceNumber?: string | null;
  },
  page: { names: string[]; phones: string[]; text: string },
): boolean {
  const name = normalizeName(listing.name);
  if (!page.names.some((n) => normalizeName(n) === name)) return false;

  // The state board confirmed this number for the listing; group practices share phones and addresses, so this is the exact tie.
  if (
    listing.licenceNumber &&
    new RegExp(`(?<!\\d)${listing.licenceNumber}(?!\\d)`).test(page.text)
  )
    return true;

  const phone = listing.phone ? normalizePhone(listing.phone) : null;
  if (phone && page.phones.some((p) => normalizePhone(p) === phone))
    return true;

  // Every listing in a run shares a city, so the city test can't separate two people with the same name.
  if (!listing.nameIsUnique) return false;
  return page.text.toLowerCase().includes(listing.city.toLowerCase());
}
