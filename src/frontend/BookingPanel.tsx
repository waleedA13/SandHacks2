import type { BookingPath, BookingSource, Call, Listing } from "@/shared/types";
import { CallPanel, LastCall } from "./CallPanel";
import { CallYourself } from "./CallYourself";
import { isWebUrl } from "./SourceList";

const SOURCE_NAMES: Record<BookingSource, string> = {
  zocdoc: "with Zocdoc",
  headway: "with Headway",
  alma: "with Alma",
  rula: "with Rula",
  practice_site: "on their website",
};

// "Aetna Open Access" already names the insurer; don't make the script say "Aetna Aetna".
export const planToAsk = (insurer: string, plan: string) =>
  plan.toLowerCase().startsWith(insurer.toLowerCase())
    ? plan
    : `${insurer} ${plan}`;

export function BookingPanel({
  listing,
  paths,
  lastCall,
  selfPay = false,
}: {
  listing: Listing;
  paths: BookingPath[];
  selfPay?: boolean;
  lastCall: Pick<Call, "summary" | "calledAt"> | null;
}) {
  const { id, name, insurer, plan, phone, bookingUrl, bookingSource } = listing;
  return (
    <section className="panel booking" aria-labelledby="book-h">
      <h2 id="book-h">How to book</h2>
      {paths.length === 0 && <p>No way to contact listed.</p>}
      {/* A mobile listing has no assistant panel, so an earlier demo call shows here instead. */}
      {!paths.includes("agent_check") && lastCall && (
        <LastCall call={lastCall} />
      )}
      {paths.map((path) => {
        if (path === "book_online" && bookingUrl && isWebUrl(bookingUrl))
          return (
            <div key={path} id="book-online" className="path">
              <h3>Book online</h3>
              <a
                className="btn"
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book online {SOURCE_NAMES[bookingSource ?? "practice_site"]}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <p>
                You&apos;ll book on their site. Check the booking says it takes{" "}
                {plan}.
              </p>
            </div>
          );
        if (path === "agent_check")
          return (
            <div key={path} id="assistant" className="path">
              <h3>Ask the assistant</h3>
              <CallPanel
                listingId={id}
                name={name}
                insurer={insurer}
                hasPhone={Boolean(phone)}
                lastCall={lastCall}
                paths={paths}
              />
            </div>
          );
        if (path === "call_yourself" && phone)
          return (
            <div key={path} id="call-yourself" className="path">
              <h3>Call yourself</h3>
              <CallYourself
                listingId={id}
                name={name}
                phone={phone}
                askPlan={planToAsk(insurer, plan)}
                selfPay={selfPay}
              />
            </div>
          );
        return null;
      })}
    </section>
  );
}
