import Link from "next/link";
import type { ListingSummary } from "@/shared/types";
import { Icon } from "./Icon";
import { checkedDate, priceText, telHref } from "./format";
import { LabelBadge } from "./LabelBadge";

const DEAD_END = new Set(["Likely dead end", "Demo call: unavailable"]);

export function ListingCard({
  listing,
  rank,
  variant,
  insurer,
  city,
}: {
  listing: ListingSummary;
  rank: number;
  variant: "full" | "compact";
  insurer: string;
  city: string;
}) {
  const { id, name, credential, phone, label } = listing;
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
      {price && <p className="price">Their posted price: {price}</p>}
      {listing.call && (
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
        {phone ? (
          <a
            className={`btn call${DEAD_END.has(label) ? " btn-outline" : ""}`}
            href={telHref(phone)}
            aria-label={`Call ${name} at ${phone}`}
          >
            <Icon name="phone" size={18} />
            {phone}
          </a>
        ) : (
          <span className="muted no-phone">No phone number listed</span>
        )}
        {/* No prefetch: 12 cards would each load a detail page (5 queries each). */}
        <Link
          className="link"
          href={`/listing/${id}?${new URLSearchParams({ insurer, city })}`}
          prefetch={false}
        >
          View details<span className="sr-only"> for {name}</span>
        </Link>
      </div>
    </article>
  );
}
