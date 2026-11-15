import { headers } from "next/headers";
import Link from "next/link";
import { planToAsk } from "@/frontend/BookingPanel";
import { fitFromParams, withFit } from "@/frontend/FitFilters";
import { checkedDate, commonPlan } from "@/frontend/format";
import { ListingCard } from "@/frontend/ListingCard";
import { first } from "@/frontend/params";
import { SearchForm } from "@/frontend/SearchForm";
import { ShareShortlist } from "@/frontend/ShareShortlist";
import { VoiceWidget } from "@/frontend/VoiceWidget";
import { getStats, listSearchOptions, listSummaries } from "@/backend/queries";
import type { Label, ListingSummary } from "@/shared/types";

// Block until the data is ready, so the full page arrives as HTML and works without JavaScript.
// A loading.tsx would stream results in hidden chunks that only JavaScript can reveal.
export const instant = false;

const REACHABLE: Label[] = [
  "Likely available",
  "Demo call: available",
  "Caller reported: available",
];
const DEAD_END: Label[] = [
  "Likely dead end",
  "Demo call: unavailable",
  "Caller reported: unavailable",
];
const MAYBE: Label[] = ["Unclear"];

type Ranked = { listing: ListingSummary; rank: number };

function CardList({
  items,
  variant,
  checked,
  query,
}: {
  items: Ranked[];
  variant: "full" | "compact";
  checked: string;
  query: string;
}) {
  return (
    <ol className="grid">
      {items.map(({ listing, rank }) => (
        <li key={listing.id}>
          <ListingCard
            listing={listing}
            rank={rank}
            variant={variant}
            checked={checked}
            query={query}
          />
        </li>
      ))}
    </ol>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const [params, options] = await Promise.all([
    searchParams,
    listSearchOptions(),
  ]);
  // The first city an insurer has listings in, matching the insurer's name ignoring case.
  const cityFor = (i: string) =>
    Object.entries(options.firstCity).find(
      ([k]) => k.toLowerCase() === i.toLowerCase(),
    )?.[1];
  // With no search in the URL, start with the first insurer and its first city.
  const start = options.insurers[0];
  const insurer = first(params.insurer) ?? start ?? "";
  const city = first(params.city)?.slice(0, 60) ?? cityFor(insurer) ?? "";

  const fit = fitFromParams(params);
  const filtering = Boolean(fit.specialty || fit.language || fit.telehealth);

  const [all, stats, h, filtered] = await Promise.all([
    listSummaries(insurer, city),
    getStats(insurer, city),
    headers(),
    filtering ? listSummaries(insurer, city, fit) : null,
  ]);
  const listings = filtered ?? all;
  // Only offer languages that some listing here actually has.
  const languages = [...new Set(all.flatMap((l) => l.languages))].sort();

  const base = new URLSearchParams({ insurer, city });
  const query = withFit(new URLSearchParams(base), fit);
  const proto = h.get("x-forwarded-proto") ?? "http";
  const shareUrl = `${proto}://${h.get("host")}/?${query}`;

  const ranked = listings.map((listing, i) => ({ listing, rank: i + 1 }));
  const reachable = ranked.filter((r) => REACHABLE.includes(r.listing.label));
  const startWith = reachable.slice(0, 3);
  const alsoTry = reachable.slice(3);
  const unclear = ranked.filter((r) => MAYBE.includes(r.listing.label));
  const payYourself = ranked.filter((r) => r.listing.label === "Pay yourself");
  const deadEnds = ranked.filter((r) => DEAD_END.includes(r.listing.label));
  const plan = commonPlan(all.map((l) => l.plan));
  // Said once above the results: the most recent check. ISO strings sort by time.
  const latest = listings
    .map((l) => l.checkedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const checked = latest ? checkedDate(latest) : "";

  return (
    <main id="main">
      <section className="intro">
        <h1>Find a therapist who will actually pick up.</h1>
        <p className="lede">
          Finding care should be easier. We rank listings using public web
          pages, so you can call the offices most likely to answer first.
        </p>
      </section>

      {start && (
        <SearchForm
          insurer={insurer}
          city={city}
          options={options}
          collapsed={stats.total > 0}
          fit={fit}
          languages={languages}
        />
      )}

      {stats.total === 0 ? (
        <section className="empty">
          {start ? (
            <>
              <p>{"We don't have listings for that insurer and place yet."}</p>
              <Link
                className="btn"
                href={`/?${new URLSearchParams({ insurer: start, city: cityFor(start) ?? "" })}`}
              >
                Show {start} in {cityFor(start)}
              </Link>
            </>
          ) : (
            <p>No listings yet.</p>
          )}
        </section>
      ) : (
        <>
          <section className="summary" aria-label="Summary">
            <p className="summary-line">
              {stats.likelyAvailable} of {stats.total} {insurer}{" "}
              {stats.total === 1 ? "listing" : "listings"} in {city}{" "}
              {stats.likelyAvailable === 1 ? "looks" : "look"} reachable.
            </p>
            <p className="soft">
              {
                "If you've hit dead numbers before, it's not you. Insurance company lists are often out of date."
              }
            </p>
          </section>

          {(plan || checked) && (
            <div className="plan">
              {plan && (
                <>
                  <p className="plan-line">
                    Checked against {planToAsk(insurer, plan)}
                  </p>
                  <p className="muted">
                    Your plan name is on your insurance card. If it says
                    something else, these results may not apply.
                  </p>
                </>
              )}
              {checked && <p className="muted">Checked {checked}</p>}
            </div>
          )}

          {filtering && (
            <p className="showing">
              <span>
                Showing {listings.length} of {stats.total}
              </span>
              <Link className="link" href={`/?${base}`}>
                Clear filters
              </Link>
            </p>
          )}

          {listings.length === 0 ? (
            <p className="empty">
              No listings match all of these. Try removing one.
            </p>
          ) : (
            <>
              <p className="print-only print-title">
                Therapists most likely to pick up ({insurer}, {city})
              </p>

              {startWith.length > 0 && (
                <section className="start" aria-labelledby="start-h">
                  <h2 id="start-h">
                    Start with{" "}
                    {startWith.length === 1
                      ? "this one"
                      : `these ${startWith.length}`}
                  </h2>
                  <CardList
                    items={startWith}
                    variant="full"
                    checked={checked}
                    query={query.toString()}
                  />
                </section>
              )}

              <ShareShortlist
                insurer={insurer}
                city={city}
                top={[
                  ...startWith,
                  ...alsoTry,
                  ...unclear,
                  ...payYourself,
                  ...deadEnds,
                ]
                  .slice(0, 3)
                  .map(({ listing: { id, name, label, phone } }) => ({
                    id,
                    name,
                    label,
                    phone,
                  }))}
                url={shareUrl}
              />

              <section className="panel phone-help" aria-labelledby="ask-h">
                <h2 id="ask-h">Not sure what to say on the phone?</h2>
                <p>Two questions are enough:</p>
                <ol>
                  <li>&ldquo;Do you take {insurer}?&rdquo;</li>
                  <li>&ldquo;Are you taking new patients?&rdquo;</li>
                </ol>
                <p>
                  If you get voicemail, leave your name and number, then try the
                  next one on the list.
                </p>
              </section>

              <section className="panel" aria-labelledby="helper-h">
                <h2 id="helper-h">Rather talk it through?</h2>
                <p>
                  Our voice helper reads you the top listings and their phone
                  numbers. ¿Habla español? El asistente también habla español.
                </p>
                <VoiceWidget mode="helper" />
              </section>

              {alsoTry.length > 0 && (
                <section aria-labelledby="also-h">
                  <h2 id="also-h">Also worth a try</h2>
                  <CardList
                    items={alsoTry}
                    variant="full"
                    checked={checked}
                    query={query.toString()}
                  />
                </section>
              )}

              {payYourself.length > 0 && (
                <section aria-labelledby="pay-h">
                  <h2 id="pay-h">If you can pay yourself</h2>
                  <p className="section-note">
                    {`These therapists don't seem to take ${insurer} now, but they see clients who pay for themselves.`}
                  </p>
                  <CardList
                    items={payYourself}
                    variant="full"
                    checked={checked}
                    query={query.toString()}
                  />
                </section>
              )}

              {unclear.length > 0 && (
                // Open when nothing above it would show a card.
                <details
                  className="more"
                  open={startWith.length + alsoTry.length === 0}
                >
                  <summary>
                    Show {unclear.length} more{" "}
                    {unclear.length === 1 ? "listing" : "listings"} we
                    couldn&apos;t confirm
                  </summary>
                  <CardList
                    items={unclear}
                    variant="compact"
                    checked={checked}
                    query={query.toString()}
                  />
                </details>
              )}

              {deadEnds.length > 0 && (
                // Folded so a list of dead ends doesn't sit there discouraging anyone.
                <section aria-labelledby="dead-h">
                  <h2 id="dead-h">Probably out of date</h2>
                  <details className="more">
                    <summary>
                      Show {deadEnds.length}{" "}
                      {deadEnds.length === 1 ? "listing" : "listings"} that
                      {deadEnds.length === 1 ? " is" : " are"} probably out of
                      date
                    </summary>
                    <CardList
                      items={deadEnds}
                      variant="compact"
                      checked={checked}
                      query={query.toString()}
                    />
                  </details>
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
