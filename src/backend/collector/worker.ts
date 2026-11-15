// Runs queued re-check jobs: evidence, then verdict. The web app only queues them.
// Run: npx tsx --env-file=.env.local src/backend/collector/worker.ts
import { pathToFileURL } from "node:url";
import { sql } from "@/backend/db/client";
import { verifyListing } from "@/backend/verifier/verify";
import { collectEvidence } from "./evidence";

// shortcut: jobs has no started_at, so age is measured from created_at; add the column if queued jobs ever wait long.
export async function failStaleJobs(): Promise<number> {
  const rows = await sql`
    update jobs set status = 'failed', finished_at = now()
    where status = 'running' and created_at < now() - interval '3 minutes'
    returning id`;
  return rows.length;
}

// Returns false when nothing was queued.
export async function runOneJob(): Promise<boolean> {
  // One statement with skip locked, so two workers never claim the same job.
  const [job] = (await sql`
    update jobs set status = 'running'
    where status = 'queued' and id = (
      select id from jobs where status = 'queued'
      order by created_at limit 1 for update skip locked)
    returning id, listing_id`) as { id: string; listing_id: string }[];
  if (!job) return false;

  const start = Date.now();
  let status: "done" | "failed" = "done";
  try {
    await collectEvidence(job.listing_id);
    await verifyListing(job.listing_id);
  } catch (e) {
    status = "failed";
    console.error(`job ${job.id}: ${(e as Error).message}`);
  }
  await sql`update jobs set status = ${status}, finished_at = now() where id = ${job.id}`;
  console.log(
    `job ${job.id} listing ${job.listing_id}: ${status} in ${((Date.now() - start) / 1000).toFixed(1)} s`,
  );
  return true;
}

async function main() {
  const stale = await failStaleJobs();
  if (stale) console.log(`marked ${stale} stale running jobs failed`);
  console.log("worker polling jobs every 2 s");
  for (;;) {
    try {
      if (await runOneJob()) continue;
    } catch (e) {
      // A dropped connection must not stop the worker.
      console.error(`poll failed: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
