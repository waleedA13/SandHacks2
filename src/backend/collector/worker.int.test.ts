import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "@/backend/db/client";
import { verifyListing } from "@/backend/verifier/verify";
import { collectEvidence } from "./evidence";
import { failStaleJobs, runOneJob } from "./worker";

// Both reach paid services (Bright Data, Gemini); the worker only orders and records them.
vi.mock(import("./evidence"), () => ({ collectEvidence: vi.fn() }));
vi.mock(import("@/backend/verifier/verify"), () => ({
  verifyListing: vi.fn(),
}));
const collect = vi.mocked(collectEvidence);
const verify = vi.mocked(verifyListing);

const L = "00000000-0000-4000-8000-0000000015a1";
const job = async (id: string) =>
  (await sql`select status, finished_at from jobs where id = ${id}`)[0];
const queue = async (status = "queued", age = "0 seconds") =>
  (
    await sql`insert into jobs (listing_id, kind, status, created_at)
      values (${L}, 'recheck', ${status}, now() - ${age}::interval) returning id`
  )[0].id as string;

beforeAll(async () => {
  await sql`insert into listings (id, insurer, plan, city, state, name, source_url)
    values (${L}, 'Aetna', 'Aetna Open Access', 'San Diego', 'CA', 'Jo Workertest', 'https://example.com/d/15a1')`;
});
afterAll(async () => {
  await sql`delete from listings where id = ${L}`;
});
beforeEach(async () => {
  await sql`delete from jobs`;
  collect.mockReset().mockResolvedValue(1);
  verify.mockReset().mockResolvedValue({} as never);
});

describe("runOneJob", () => {
  it("collects evidence, then verifies, then marks the job done", async () => {
    const id = await queue();
    const order: string[] = [];
    collect.mockImplementation(async () => (order.push("collect"), 1));
    verify.mockImplementation(async () => (order.push("verify"), {}) as never);

    expect(await runOneJob()).toBe(true);

    expect(order).toEqual(["collect", "verify"]);
    expect(collect).toHaveBeenCalledWith(L);
    expect(verify).toHaveBeenCalledWith(L);
    const row = await job(id);
    expect(row.status).toBe("done");
    expect(row.finished_at).not.toBeNull();
  });

  it("marks the job failed when a step throws", async () => {
    const id = await queue();
    collect.mockRejectedValue(new Error("SERP 502"));

    expect(await runOneJob()).toBe(true);

    expect(verify).not.toHaveBeenCalled();
    const row = await job(id);
    expect(row.status).toBe("failed");
    expect(row.finished_at).not.toBeNull();
  });

  it("returns false and does nothing when no job is queued", async () => {
    const done = await queue("done");
    expect(await runOneJob()).toBe(false);
    expect(collect).not.toHaveBeenCalled();
    expect((await job(done)).status).toBe("done");
  });

  it("never gives one queued job to two workers", async () => {
    await queue();
    const ran = await Promise.all([runOneJob(), runOneJob()]);
    expect(ran.filter(Boolean)).toHaveLength(1);
    expect(collect).toHaveBeenCalledTimes(1);
  });
});

describe("failStaleJobs", () => {
  it("fails jobs running over 3 minutes and leaves newer ones", async () => {
    const stale = await queue("running", "4 minutes");
    const fresh = await queue("running", "1 minute");

    await failStaleJobs();

    expect((await job(stale)).status).toBe("failed");
    expect((await job(fresh)).status).toBe("running");
  });
});
