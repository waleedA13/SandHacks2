import { sql } from "./db/client";
import { scoreVerdict } from "@/shared/score";
import type {
  Call,
  Evidence,
  Label,
  Listing,
  Job,
  ListingSummary,
  Tri,
  Verdict,
} from "@/shared/types";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A malformed id would make Postgres throw; treat it as not found instead.
export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && UUID.test(s);

const iso = (d: unknown) =>
  d == null ? null : new Date(d as string).toISOString();
const tri = (t: Tri | null): Tri => t ?? "unknown";

// Final score: the web facts, overridden by the latest done call. Never read verdicts.score.
function finalScore(r: Row): { score: number; label: Label } {
  const facts = {
    stillPractising: tri(r.still_practising),
    listsInsurer: tri(r.lists_insurer),
    acceptingNew: tri(r.v_accepting_new),
    seesSelfPay: tri(r.sees_self_pay),
  };
  return r.called_at
    ? scoreVerdict(facts, {
        takesPlan: tri(r.takes_plan),
        acceptingNew: tri(r.c_accepting_new),
        source: r.c_source,
      })
    : scoreVerdict(facts);
}

export type Filters = {
  specialty?: string | null;
  language?: string | null;
  telehealth?: Tri | null;
};

// One query for every read: a listing, its verdict (if any) and its latest done call (if any).
function summaryRows(
  where: { id?: string; insurer?: string; city?: string },
  f: Filters = {},
) {
  // One box takes a city or a ZIP code: five digits match a whole ZIP in the address.
  const place = where.city?.trim().slice(0, 60);
  const zip = place && /^\d{5}$/.test(place) ? place : null;
  const city = zip ? null : (place ?? null);
  return sql`
    select l.id, l.name, l.credential, l.address, l.phone, l.plan,
           l.booking_url, l.booking_source, l.phone_line_type, v.sees_self_pay,
           (select count(distinct source)::int from evidence where listing_id = l.id) + 1 as source_count,
           v.still_practising, v.lists_insurer, v.accepting_new as v_accepting_new,
           v.reason, v.checked_at, v.specialties, v.languages, v.telehealth,
           v.self_pay_min, v.self_pay_max, v.license_status,
           c.takes_plan, c.accepting_new as c_accepting_new, c.summary, c.called_at, c.source as c_source
    from listings l
    left join verdicts v on v.listing_id = l.id
    left join lateral (
      select takes_plan, accepting_new, summary, called_at, source from calls
      where listing_id = l.id and status = 'done'
      order by called_at desc limit 1
    ) c on true
    where (${where.id ?? null}::uuid is null or l.id = ${where.id ?? null}::uuid)
      and (${where.insurer ?? null}::text is null or lower(l.insurer) = lower(${where.insurer ?? null}))
      and (${city}::text is null or lower(l.city) = lower(${city}))
      and (${zip}::text is null or l.address ~ ('(^|[^0-9])' || ${zip}::text || '([^0-9]|$)'))
      and (${f.specialty ?? null}::text is null
           or exists (select 1 from unnest(v.specialties) s where lower(s) = lower(${f.specialty ?? null})))
      and (${f.language ?? null}::text is null
           or exists (select 1 from unnest(v.languages) s where lower(s) = lower(${f.language ?? null})))
      and (${f.telehealth ?? null}::text is null or v.telehealth = ${f.telehealth ?? null})`;
}

function toSummary(r: Row): ListingSummary {
  return {
    id: r.id,
    name: r.name,
    credential: r.credential,
    address: r.address,
    phone: r.phone,
    ...finalScore(r),
    // A listing with no verdict yet: neutral defaults, score 50 "Unclear".
    reason: r.reason ?? "Not checked yet.",
    checkedAt: iso(r.checked_at) ?? "",
    specialties: r.specialties ?? [],
    languages: r.languages ?? [],
    telehealth: tri(r.telehealth),
    selfPayMin: r.self_pay_min,
    selfPayMax: r.self_pay_max,
    licenseStatus: r.license_status ?? "unchecked",
    bookingUrl: r.booking_url,
    bookingSource: r.booking_source,
    phoneLineType: r.phone_line_type,
    plan: r.plan,
    seesSelfPay: tri(r.sees_self_pay),
    sourceCount: r.source_count,
    call: r.called_at
      ? {
          takesPlan: r.takes_plan,
          acceptingNew: r.c_accepting_new,
          summary: r.summary,
          calledAt: iso(r.called_at)!,
        }
      : null,
  };
}

const isCall = (s: ListingSummary) =>
  s.label.startsWith("Demo call") || s.label.startsWith("Caller reported");

export async function listSummaries(
  insurer: string,
  city: string,
  filters?: Filters,
): Promise<ListingSummary[]> {
  const rows = await summaryRows({ insurer, city }, filters);
  return rows.map(toSummary).sort(
    (a, b) =>
      b.score - a.score ||
      // On a tie, a call result is stronger evidence: above at the top, below at the bottom.
      (a.score >= 50 ? 1 : -1) * (Number(isCall(b)) - Number(isCall(a))) ||
      a.name.localeCompare(b.name),
  );
}

// What the search form offers: every insurer and city with listings, A to Z,
// and each insurer's first city, used when a search names no city.
export async function listSearchOptions(): Promise<{
  insurers: string[];
  cities: string[];
  firstCity: Record<string, string>;
}> {
  const [insurers, cities, firsts] = await Promise.all([
    sql`select distinct insurer from listings order by insurer`,
    sql`select distinct city from listings order by city`,
    sql`select distinct on (insurer) insurer, city from listings order by insurer, city`,
  ]);
  return {
    insurers: insurers.map((r) => r.insurer),
    cities: cities.map((r) => r.city),
    firstCity: Object.fromEntries(firsts.map((r) => [r.insurer, r.city])),
  };
}

export type Detail = {
  listing: Listing;
  verdict: Verdict | null;
  score: number;
  label: Label;
  evidence: Pick<Evidence, "source" | "url" | "fetchedAt" | "rawText">[];
  calls: Call[];
};

export async function getDetail(id: string): Promise<Detail | null> {
  if (!isUuid(id)) return null;
  const [[l], [v], evidence, calls, [s]] = await Promise.all([
    sql`select * from listings where id = ${id}`,
    sql`select * from verdicts where listing_id = ${id}`,
    sql`select source, url, fetched_at, left(raw_text, 300) as raw_text
        from evidence where listing_id = ${id} order by fetched_at desc`,
    sql`select * from calls where listing_id = ${id} order by called_at desc`,
    summaryRows({ id }),
  ]);
  if (!l) return null;
  return {
    listing: {
      id: l.id,
      insurer: l.insurer,
      plan: l.plan,
      city: l.city,
      state: l.state,
      name: l.name,
      credential: l.credential,
      address: l.address,
      phone: l.phone,
      npi: l.npi,
      sourceUrl: l.source_url,
      scrapedAt: iso(l.scraped_at)!,
      bookingUrl: l.booking_url,
      bookingSource: l.booking_source,
      phoneLineType: l.phone_line_type,
    },
    verdict: v
      ? {
          listingId: v.listing_id,
          stillPractising: v.still_practising,
          listsInsurer: v.lists_insurer,
          acceptingNew: v.accepting_new,
          score: v.score,
          reason: v.reason,
          checkedAt: iso(v.checked_at)!,
          specialties: v.specialties,
          languages: v.languages,
          telehealth: v.telehealth,
          selfPayMin: v.self_pay_min,
          selfPayMax: v.self_pay_max,
          licenseStatus: v.license_status,
          licenseDiscipline: v.license_discipline,
          seesSelfPay: v.sees_self_pay,
        }
      : null,
    ...finalScore(s),
    evidence: evidence.map((e) => ({
      source: e.source,
      url: e.url,
      fetchedAt: iso(e.fetched_at)!,
      rawText: e.raw_text,
    })),
    calls: calls.map((c) => ({
      id: c.id,
      listingId: c.listing_id,
      status: c.status,
      takesPlan: c.takes_plan,
      acceptingNew: c.accepting_new,
      summary: c.summary,
      calledAt: iso(c.called_at)!,
      source: c.source,
    })),
  };
}

export async function getStats(insurer: string, city: string) {
  const rows = await listSummaries(insurer, city);
  const total = rows.length;
  const likelyAvailable = rows.filter((r) => r.score >= 70).length;
  const likelyDeadEnd = rows.filter((r) => r.score < 40).length;
  return {
    total,
    likelyAvailable,
    unclear: total - likelyAvailable - likelyDeadEnd,
    likelyDeadEnd,
    deadEndPct: total ? Math.round((likelyDeadEnd / total) * 100) : 0,
  };
}

export type CallInput = {
  listingId: string;
  takesPlan: Tri;
  acceptingNew: Tri;
  summary?: string | null;
};

// The voice agent saves exactly this summary when the office asks not to be called again.
export const OPT_OUT_SUMMARY = "Opted out of calls.";

// Inserts a done call; an opt-out also puts the listing's own phone on do_not_call.
// Phones are keyed by their last 10 digits, so "(619) 555-0101" and "+1 619 555 0101" match.
// Returns the listing's final score, or null if the listing does not exist.
export async function recordCall(input: CallInput) {
  if (!isUuid(input.listingId)) return null;
  const inserted = await sql`
    insert into calls (listing_id, status, takes_plan, accepting_new, summary)
    select id, 'done', ${input.takesPlan}, ${input.acceptingNew}, ${input.summary ?? null}
    from listings where id = ${input.listingId}
    returning id`;
  if (!inserted.length) return null;
  if (input.summary?.trim() === OPT_OUT_SUMMARY)
    await sql`
      insert into do_not_call (phone)
      select right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) from listings
      where id = ${input.listingId} and phone ~ '[0-9]'
      on conflict do nothing`;
  const [s] = await summaryRows({ id: input.listingId });
  return finalScore(s);
}

// shortcut: two truly concurrent requests can both insert; a partial unique index on jobs would close that.
export async function enqueueRecheck(
  listingId: string,
): Promise<string | null> {
  if (!isUuid(listingId)) return null;
  const [row] = await sql`
    with open as (
      select id from jobs
      where listing_id = ${listingId} and status in ('queued', 'running')
      order by created_at limit 1
    ), made as (
      insert into jobs (listing_id, kind, status)
      select id, 'recheck', 'queued' from listings
      where id = ${listingId} and not exists (select 1 from open)
      returning id
    )
    select id from open union all select id from made`;
  return row?.id ?? null;
}

export async function getJob(
  id: string,
): Promise<{ status: Job["status"] } | null> {
  if (!isUuid(id)) return null;
  const [row] = await sql`select status from jobs where id = ${id}`;
  return row ? { status: row.status } : null;
}

// Name, insurer and the opt-out flag only: the phone is never returned, so it can never be dialled.
export async function getCallTarget(
  id: string,
): Promise<{ name: string; insurer: string; optedOut: boolean } | null> {
  if (!isUuid(id)) return null;
  const [row] = await sql`
    select name, insurer, exists (
      select 1 from do_not_call
      where phone = right(regexp_replace(listings.phone, '[^0-9]', '', 'g'), 10)
    ) as opted_out
    from listings where id = ${id}`;
  return row
    ? { name: row.name, insurer: row.insurer, optedOut: row.opted_out }
    : null;
}

// Each outbound call costs money and rings a phone, so at most one starts per 60 seconds.
// Returns the new in_progress call's id, or null while another call holds the slot.
// shortcut: two truly concurrent requests can both claim it; an advisory lock would close that.
export async function claimCallSlot(listingId: string): Promise<string | null> {
  const [row] = await sql`
    insert into calls (listing_id, status)
    select ${listingId}::uuid, 'in_progress'
    where not exists (
      select 1 from calls
      where status = 'in_progress' and called_at > now() - interval '60 seconds'
    )
    returning id`;
  return row?.id ?? null;
}

// Marks a call that never started so it no longer holds the slot.
export async function failCall(id: string) {
  await sql`update calls set status = 'failed' where id = ${id}`;
}
