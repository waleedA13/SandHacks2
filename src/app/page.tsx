import { headers } from "next/headers";
import Link from "next/link";
import { fitFromParams, withFit } from "@/frontend/FitFilters";
import { ListingCard } from "@/frontend/ListingCard";
import { first } from "@/frontend/params";
import { SearchForm } from "@/frontend/SearchForm";
import { ShareShortlist } from "@/frontend/ShareShortlist";
import { getStats, listSearchOptions, listSummaries } from "@/backend/queries";
import type { Label, ListingSummary } from "@/shared/types";

// Block until the data is ready, so the full page arrives as HTML and works without JavaScript.
// A loading.tsx would stream results in hidden chunks that only JavaScript can reveal.
export const instant = false;

const REACHABLE: Label[] = ["Likely available", "Demo call: available"];
const DEAD_END: Label[] = ["Likely dead end", "Demo call: unavailable"];

type Ranked = { listing: ListingSummary; rank: number };

function CardList({
  items,
  variant,
  insurer,
  query,
}: {
  items: Ranked[];
  variant: "full" | "compact";
  insurer: string;
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
            insurer={insurer}
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
  // With no search in the URL, start with the first insurer and city that have listings.
  const insurer = first(params.insurer) ?? options.first?.insurer ?? "";
  const city = first(params.city)?.slice(0, 60) ?? options.first?.city ?? "";

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
  const alsoTry = [
    ...reachable.slice(3),
    ...ranked.filter((r) => r.listing.label === "Unclear"),
  ];
  const deadEnds = ranked.filter((r) => DEAD_END.includes(r.listing.label));

  return (
    <main id="main">
      <section className="intro">
        <h1>Find a therapist who will actually pick up.</h1>
        <p className="lede">
          Finding care should be easier. We rank listings using public web
          pages, so you can call the offices most likely to answer first.
        </p>
      </section>

      {options.first && (
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
          {options.first ? (
            <>
              <p>{"We don't have listings for that insurer and place yet."}</p>
              <Link
                className="btn"
                href={`/?${new URLSearchParams(options.first)}`}
              >
                Show {options.first.insurer} in {options.first.city}
              </Link>
            </>
          ) : (
            <p>No listings yet.</p>
          )}
        </section>
      ) : (
        <>
          <section className="summary" aria-label="Summary">
            <span className="big" aria-hidden="true">
              {stats.likelyAvailable}
            </span>
            <div>
              <p className="summary-line">
                Of {stats.total} {insurer} listings in {city},{" "}
                {stats.likelyAvailable} look reachable.
              </p>
              <p className="soft">
                {
                  "If you've hit dead numbers before, it's not you. Insurance company lists are often out of date."
                }
              </p>
            </div>
          </section>

          <p className="progress">
            You narrowed {stats.total} listings to {stats.likelyAvailable} worth
            calling.
          </p>

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
              <ShareShortlist
                insurer={insurer}
                city={city}
                top={[...startWith, ...alsoTry, ...deadEnds]
                  .slice(0, 3)
                  .map(({ listing: { id, name, label, phone } }) => ({
                    id,
                    name,
                    label,
                    phone,
                  }))}
                url={shareUrl}
              />
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
                    insurer={insurer}
                    query={query.toString()}
                  />
                </section>
              )}

              {alsoTry.length > 0 && (
                <section aria-labelledby="also-h">
                  <h2 id="also-h">Also worth a try</h2>
                  <CardList
                    items={alsoTry}
                    variant="full"
                    insurer={insurer}
                    query={query.toString()}
                  />
                </section>
              )}

              {deadEnds.length > 0 && (
                <section aria-labelledby="dead-h">
                  <h2 id="dead-h">Likely dead end</h2>
                  <CardList
                    items={deadEnds}
                    variant="compact"
                    insurer={insurer}
                    query={query.toString()}
                  />
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
