const API = "https://npiregistry.cms.hhs.gov/api/";

/** The NPI when the public registry has exactly one match, else null (also when the registry fails, so one hiccup doesn't lose a scrape). */
export async function lookupNpi(
  firstName: string,
  lastName: string,
  city: string,
  state: string,
): Promise<string | null> {
  try {
    return await query(firstName, lastName, city, state);
  } catch (e) {
    console.warn(`NPI lookup failed for ${firstName} ${lastName}: ${e}`);
    return null;
  }
}

async function query(
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
