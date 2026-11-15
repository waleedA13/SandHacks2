import { getStats } from "@/lib/queries";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const insurer = q.get("insurer");
  const city = q.get("city");
  if (!insurer || !city)
    return Response.json(
      { error: "insurer and city are required" },
      { status: 400 },
    );
  return Response.json(await getStats(insurer, city));
}
