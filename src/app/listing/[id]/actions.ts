"use server";

import { isUuid, recordReport } from "@/backend/queries";

export type ReportState = "sent" | "too_soon" | "error" | null;

// The no-JavaScript path of the self-call report: a plain form post that re-renders the page.
// With JavaScript the form posts to /api/listings/[id]/report instead.
export async function sendReport(
  listingId: string,
  _prev: ReportState,
  form: FormData,
): Promise<ReportState> {
  // A bound argument comes back from the client, so check it like the API route does.
  if (!isUuid(listingId)) return "error";
  const answered = form.get("answered");
  const accepting = form.get("acceptingNew");
  if (answered !== "yes" && answered !== "no") return "error";
  const acceptingNew =
    accepting === "yes" || accepting === "no" ? accepting : "unknown";
  const result = await recordReport(listingId, answered, acceptingNew);
  return result === "too_soon" ? "too_soon" : result ? "sent" : "error";
}
