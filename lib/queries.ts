import { sql } from "./db";
import { scoreVerdict } from "./score";
import type {
  Call,
  Evidence,
  Label,
  Listing,
  Job,
  ListingSummary,
  Tri,
  Verdict,
} from "./types";

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
  };
  return r.called_at
    ? scoreVerdict(facts, {
        takesPlan: tri(r.takes_plan),
        acceptingNew: tri(r.c_accepting_new),
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
  return sql`
    select l.id, l.name, l.credential, l.address, l.phone,
           v.still_practising, v.lists_insurer, v.accepting_new as v_accepting_new,
           v.reason, v.checked_at, v.specialties, v.languages, v.telehealth,
           v.self_pay_min, v.self_pay_max, v.license_status,
           c.takes_plan, c.accepting_new as c_accepting_new, c.summary, c.called_at
    from listings l
    left join verdicts v on v.listing_id = l.id
    left join lateral (
      select takes_plan, accepting_new, summary, called_at from calls
      where listing_id = l.id and status = 'done'
      order by called_at desc limit 1
    ) c on true
    where (${where.id ?? null}::uuid is null or l.id = ${where.id ?? null}::uuid)
      and (${where.insurer ?? null}::text is null or lower(l.insurer) = lower(${where.insurer ?? null}))
      and (${where.city ?? null}::text is null or lower(l.city) = lower(${where.city ?? null}))
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

const isCall = (s: ListingSummary) => s.label.startsWith("Demo call");

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

// Inserts a done call and nothing else. Returns the listing's final score, or null if the listing does not exist.
export async function recordCall(input: CallInput) {
  if (!isUuid(input.listingId)) return null;
  const inserted = await sql`
    insert into calls (listing_id, status, takes_plan, accepting_new, summary)
    select id, 'done', ${input.takesPlan}, ${input.acceptingNew}, ${input.summary ?? null}
    from listings where id = ${input.listingId}
    returning id`;
  if (!inserted.length) return null;
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

// Name and insurer only: the phone is never read here, so it can never be dialled.
export async function getCallTarget(
  id: string,
): Promise<{ name: string; insurer: string } | null> {
  if (!isUuid(id)) return null;
  const [row] = await sql`select name, insurer from listings where id = ${id}`;
  return row ? { name: row.name, insurer: row.insurer } : null;
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
