import { getDetail } from "@/backend/queries";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const detail = await getDetail((await ctx.params).id);
  return detail
    ? Response.json(detail)
    : Response.json({ error: "listing not found" }, { status: 404 });
}
