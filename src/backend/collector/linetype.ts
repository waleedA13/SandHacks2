// Looks up each listing's office line type once (Twilio Lookup v2, line type intelligence, about 1 cent each).
// The only file that calls Twilio Lookup. Run after evidence.ts:
// npx tsx --env-file=.env.local src/backend/collector/linetype.ts --all
import { pathToFileURL } from "node:url";
import type { PhoneLineType } from "@/shared/types";
import { normalizePhone } from "./normalize";

const TYPES: Record<string, PhoneLineType> = {
  landline: "landline",
  mobile: "mobile",
  fixedVoip: "voip",
  nonFixedVoip: "voip",
};

/** landline, mobile or voip from Twilio; unknown for anything else, including any failure. Never guesses. */
export async function lookupLineType(phone: string): Promise<PhoneLineType> {
  const digits = normalizePhone(phone);
  if (!digits) return "unknown";
  try {
    const auth = btoa(
      `${process.env.TWILIO_API_KEY_SID}:${process.env.TWILIO_API_KEY_SECRET}`,
    );
    const res = await fetch(
      `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(`+1${digits}`)}?Fields=line_type_intelligence`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    if (!res.ok) throw new Error(`Twilio Lookup ${res.status}`);
    const data = (await res.json()) as {
      line_type_intelligence?: { type?: string | null };
    };
    return TYPES[data.line_type_intelligence?.type ?? ""] ?? "unknown";
  } catch (e) {
    console.warn(`line type lookup failed: ${e}`);
    return "unknown";
  }
}

async function main(args: string[]) {
  if (!args.includes("--all")) {
    console.error("Usage: tsx src/backend/collector/linetype.ts --all");
    process.exit(2);
  }
  // Imported here so the unit test can load this file without a database.
  const { sql } = await import("@/backend/db/client");
  // Only rows still unknown, so a re-run pays only for numbers that failed or are new.
  const rows = (await sql`
    select id, phone from listings
    where phone is not null and phone_line_type = 'unknown'
      and source_url not like 'https://example.com/%'`) as {
    id: string;
    phone: string;
  }[];
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const type = await lookupLineType(r.phone);
    await sql`update listings set phone_line_type = ${type} where id = ${r.id}`;
    counts[type] = (counts[type] ?? 0) + 1;
  }
  console.log(`looked up ${rows.length} numbers:`, counts);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  await main(process.argv.slice(2));
