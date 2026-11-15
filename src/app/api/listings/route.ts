import { listSummaries } from "@/backend/queries";
import type { Tri } from "@/shared/types";

const TRI = ["yes", "no", "unknown"];

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const insurer = q.get("insurer");
  const city = q.get("city");
  const telehealth = q.get("telehealth");
  if (!insurer || !city || (telehealth && !TRI.includes(telehealth)))
    return Response.json(
      {
        error:
          "insurer and city are required; telehealth must be yes, no or unknown",
      },
      { status: 400 },
    );
  return Response.json(
    await listSummaries(insurer, city, {
      specialty: q.get("specialty"),
      language: q.get("language"),
      telehealth: telehealth as Tri | null,
    }),
  );
}
