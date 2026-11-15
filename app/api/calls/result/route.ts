import { createHash, timingSafeEqual } from "node:crypto";
import { isUuid, recordCall } from "@/lib/queries";

const TRI = ["yes", "no", "unknown"];
// Hash both sides so the comparison is constant-time even when the lengths differ.
const digest = (s: string) => createHash("sha256").update(s).digest();

function authorized(request: Request) {
  const secret = process.env.CALLS_WEBHOOK_SECRET;
  const given = request.headers.get("x-webhook-secret");
  if (!secret || given === null) return false;
  return timingSafeEqual(digest(given), digest(secret));
}

// Called by the voice agent's webhook with the outcome of a demo call.
export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ok =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    isUuid(body.listingId) &&
    TRI.includes(body.takesPlan) &&
    TRI.includes(body.acceptingNew) &&
    (body.summary == null ||
      (typeof body.summary === "string" && body.summary.length <= 2000));
  if (!ok)
    return Response.json(
      {
        error:
          "body must be { listingId: uuid, takesPlan, acceptingNew: yes|no|unknown, summary?: string }",
      },
      { status: 400 },
    );

  const result = await recordCall(body);
  return result
    ? Response.json(result)
    : Response.json({ error: "listing not found" }, { status: 404 });
}
