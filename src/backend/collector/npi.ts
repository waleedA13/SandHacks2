import { normalizeName, normalizePhone } from "./normalize";
const API = "https://npiregistry.cms.hhs.gov/api/";

/** The NPI when the public registry has exactly one match, else null. */
export async function lookupNpi(
  firstName: string,
  lastName: string,
  city: string,
  state: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    version: "2.1",
    first_name: firstName,
    last_name: lastName,
    city,
    state,
    limit: "2",
  });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`NPI Registry ${res.status}`);
  const data = (await res.json()) as {
    result_count?: number;
    results?: { number: number | string }[];
  };
  return data.result_count === 1 && data.results?.[0]
    ? String(data.results[0].number)
    : null;
}

type NpiResult = {
  number: number | string;
  addresses: {
    address_purpose: string;
    city: string;
    telephone_number?: string;
  }[];
  taxonomies: { state?: string; license?: string }[];
};

/**
 * California licence numbers the NPI Registry lists for this listing.
 * Uses the listing's NPI when it has one; otherwise a statewide name search, accepted only
 * when exactly one result practises in the listing's city or answers its phone.
 */
export async function npiLicences(listing: {
  name: string;
  city: string;
  phone: string | null;
  npi: string | null;
}): Promise<{ npi: string; numbers: string[] } | null> {
  const words = normalizeName(listing.name).split(" ");
  const params = new URLSearchParams(
    listing.npi
      ? { version: "2.1", number: listing.npi }
      : {
          version: "2.1",
          first_name: words[0],
          last_name: words.at(-1) ?? "",
          state: "CA",
          limit: "50",
        },
  );
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`NPI Registry ${res.status}`);
  const all = ((await res.json()) as { results?: NpiResult[] }).results ?? [];
  const phone = listing.phone && normalizePhone(listing.phone);
  const here = listing.npi
    ? all
    : all.filter((r) =>
        r.addresses.some(
          (a) =>
            a.address_purpose === "LOCATION" &&
            (a.city.toUpperCase() === listing.city.toUpperCase() ||
              (!!phone && normalizePhone(a.telephone_number ?? "") === phone)),
        ),
      );
  if (here.length !== 1) return null;
  return {
    npi: String(here[0].number),
    numbers: here[0].taxonomies
      .filter((t) => t.state === "CA" && t.license)
      .map((t) => t.license!.replace(/\D/g, ""))
      .filter(Boolean),
  };
}
