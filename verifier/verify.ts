import { pathToFileURL } from "node:url";
import { sql } from "@/lib/db";
import { scoreVerdict } from "@/lib/score";
import type { Verdict } from "@/lib/types";
import { extractFacts, type Facts } from "./gemini";

const NO_EVIDENCE: Facts = {
  stillPractising: "unknown",
  listsInsurer: "unknown",
  acceptingNew: "unknown",
  reason: "We found no other information about this listing.",
};

// Writes the web-evidence score only. Call results are applied when data is read, so this never touches `calls`.
export async function verifyListing(listingId: string): Promise<Verdict> {
  const [listing] =
    await sql`select name, insurer from listings where id = ${listingId}`;
  if (!listing) throw new Error(`Listing ${listingId} not found.`);

  const evidence = await sql`
    select source, raw_text as text from evidence
    where listing_id = ${listingId} order by fetched_at`;

  // If extractFacts throws, nothing is written and the old verdict stays.
  const facts = evidence.length
    ? await extractFacts({
        name: listing.name,
        insurer: listing.insurer,
        evidence: evidence.map((e) => ({ source: e.source, text: e.text })),
      })
    : NO_EVIDENCE;
  const reason = facts.reason.slice(0, 140);
  const { score } = scoreVerdict(facts);

  const [row] = await sql`
    insert into verdicts (listing_id, still_practising, lists_insurer, accepting_new, score, reason, checked_at)
    values (${listingId}, ${facts.stillPractising}, ${facts.listsInsurer}, ${facts.acceptingNew}, ${score}, ${reason}, now())
    on conflict (listing_id) do update set
      still_practising = excluded.still_practising,
      lists_insurer = excluded.lists_insurer,
      accepting_new = excluded.accepting_new,
      score = excluded.score,
      reason = excluded.reason,
      checked_at = excluded.checked_at
    returning *`;

  return {
    listingId: row.listing_id,
    stillPractising: row.still_practising,
    listsInsurer: row.lists_insurer,
    acceptingNew: row.accepting_new,
    score: row.score,
    reason: row.reason,
    checkedAt: new Date(row.checked_at).toISOString(),
    specialties: row.specialties,
    languages: row.languages,
    telehealth: row.telehealth,
    selfPayMin: row.self_pay_min,
    selfPayMax: row.self_pay_max,
    licenseStatus: row.license_status,
    licenseDiscipline: row.license_discipline,
  };
}

async function main(args: string[]) {
  const i = args.indexOf("--listing");
  const ids = args.includes("--all")
    ? (await sql`select id from listings order by id`).map((r) => r.id)
    : i >= 0 && args[i + 1]
      ? [args[i + 1]]
      : [];
  if (!ids.length) {
    console.error("Usage: tsx verifier/verify.ts --all | --listing <id>");
    process.exit(2);
  }

  let failed = 0;
  // At most 5 Gemini requests at once.
  for (let start = 0; start < ids.length; start += 5) {
    const batch = ids.slice(start, start + 5);
    const results = await Promise.allSettled(batch.map(verifyListing));
    results.forEach((r, j) => {
      if (r.status === "fulfilled")
        console.log(`${batch[j]}  ${r.value.score}  ${r.value.reason}`);
      else {
        failed++;
        console.error(`${batch[j]}  FAILED  ${r.reason}`);
      }
    });
  }
  console.log(`verified ${ids.length - failed} of ${ids.length}`);
  if (failed) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  await main(process.argv.slice(2));
