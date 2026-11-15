import { getJob } from "@/backend/queries";

export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const job = await getJob((await ctx.params).id);
  return job
    ? Response.json(job)
    : Response.json({ error: "job not found" }, { status: 404 });
}
