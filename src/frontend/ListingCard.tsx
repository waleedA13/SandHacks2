import Link from "next/link";
import type { ListingSummary } from "@/shared/types";
import { Icon } from "./Icon";
import { checkedDate, priceText, telHref } from "./format";
import { LabelBadge } from "./LabelBadge";

const DEAD_END = new Set([
  "Likely dead end",
  "Demo call: unavailable",
  "Caller reported: unavailable",
]);

// recordReport's summary for a caller report: that call is a person's, not a demo call.
const CALLER_REPORT = "Reported by someone who called.";

export function ListingCard({
  listing,
  rank,
  variant,
  insurer,
  query,
}: {
  listing: ListingSummary;
  rank: number;
  variant: "full" | "compact";
  insurer: string;
  // The results page's query string, so "Back to results" can return to it.
  query: string;
}) {
  const { id, name, credential, phone, label, paths } = listing;
  const headingId = `listing-${id}`;
  const price = priceText(listing.selfPayMin, listing.selfPayMax);
  return (
    <article className={`card card-${variant}`} aria-labelledby={headingId}>
      <LabelBadge label={label} />
      <h3 id={headingId}>
        <span className="rank">{rank}.</span> {name}
        {credential && <span className="cred">, {credential}</span>}
      </h3>
      <p>{listing.reason}</p>
      <p className="sources-count">
        Checked in {listing.sourceCount}{" "}
        {listing.sourceCount === 1 ? "place" : "places"}
      </p>
      {price && <p className="price">Their posted price: {price}</p>}
      {listing.call && !listing.call.summary?.startsWith(CALLER_REPORT) && (
        <p className="demo">
          <Icon name="info" />
          <span>Demo call. No real office was contacted.</span>
        </p>
      )}
      <p className="muted">Last checked {checkedDate(listing.checkedAt)}</p>
      <details className="script">
        <summary>
          <Icon name="info" size={18} />
          What to ask when they answer
        </summary>
        <ol>
          <li>&ldquo;Do you take {insurer}?&rdquo;</li>
          <li>&ldquo;Are you accepting new patients?&rdquo;</li>
        </ol>
      </details>
      <div className="actions">
        {paths.length === 0 && (
          <span className="muted no-phone">No way to contact listed.</span>
        )}
        {paths.map((path, i) => {
          // The first path is the main button; the others are smaller links.
          const cls =
            i > 0 ? "link" : `btn${DEAD_END.has(label) ? " btn-outline" : ""}`;
          if (path === "book_online" && listing.bookingUrl)
            return (
              <a
                key={path}
                className={cls}
                href={listing.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book online
                <span className="sr-only">
                  {" "}
                  with {name} (opens in a new tab)
                </span>
              </a>
            );
          if (path === "agent_check")
            return (
              <Link
                key={path}
                className={cls}
                href={`/listing/${id}?${query}#assistant`}
                prefetch={false}
              >
                Ask the assistant to call
                <span className="sr-only"> {name}</span>
              </Link>
            );
          if (path === "call_yourself" && phone)
            return (
              <a key={path} className={cls} href={telHref(phone)}>
                {i === 0 && <Icon name="phone" size={18} />}
                Call {phone}
                <span className="sr-only">, {name}</span>
              </a>
            );
          return null;
        })}
        {/* No prefetch: 12 cards would each load a detail page (5 queries each). */}
        <Link
          className="link"
          href={`/listing/${id}?${query}`}
          prefetch={false}
        >
          View details<span className="sr-only"> for {name}</span>
        </Link>
      </div>
    </article>
  );
}
