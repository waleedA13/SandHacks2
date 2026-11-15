import { enqueueRecheck } from "@/lib/queries";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/listings/[id]/recheck">,
) {
  const jobId = await enqueueRecheck((await ctx.params).id);
  return jobId
    ? Response.json({ jobId })
    : Response.json({ error: "listing not found" }, { status: 404 });
}
