import { isUuid, recordReport } from "@/backend/queries";

const reply = (status: number, body: object, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

// The one-tap report after "Call them yourself". Reads only the two answers:
// any other field, header or cookie is ignored and nothing about the reporter is stored.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/listings/[id]/report">,
) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (
    !isUuid(id) ||
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !["yes", "no"].includes(body.answered) ||
    !["yes", "no", "unknown"].includes(body.acceptingNew)
  )
    return reply(400, {
      error:
        "body must be { answered: yes|no, acceptingNew: yes|no|unknown } for a listing uuid",
    });

  const result = await recordReport(id, body.answered, body.acceptingNew);
  if (result === null) return reply(404, { error: "listing not found" });
  if (result === "too_soon")
    return reply(
      429,
      { error: "This listing was reported a moment ago. Try again shortly." },
      { "Retry-After": "60" },
    );
  return reply(200, result);
}
