import Link from "next/link";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { ListingCard } from "@/components/ListingCard";
import { SearchForm } from "@/components/SearchForm";
import { getStats, listSummaries } from "@/lib/queries";
import type { Label, ListingSummary } from "@/lib/types";

// Block until the data is ready, so the full page arrives as HTML and works without JavaScript.
// A loading.tsx would stream results in hidden chunks that only JavaScript can reveal.
export const instant = false;

const REACHABLE: Label[] = ["Likely available", "Demo call: available"];
const DEAD_END: Label[] = ["Likely dead end", "Demo call: unavailable"];

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

type Ranked = { listing: ListingSummary; rank: number };

function CardList({
  items,
  variant,
  insurer,
  city,
}: {
  items: Ranked[];
  variant: "full" | "compact";
  insurer: string;
  city: string;
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
            city={city}
          />
        </li>
      ))}
    </ol>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const insurer = first(params.insurer) ?? "Aetna";
  const city = first(params.city) ?? "San Diego";

  const [listings, stats] = await Promise.all([
    listSummaries(insurer, city),
    getStats(insurer, city),
  ]);

  const ranked = listings.map((listing, i) => ({ listing, rank: i + 1 }));
  const reachable = ranked.filter((r) => REACHABLE.includes(r.listing.label));
  const startWith = reachable.slice(0, 3);
  const alsoTry = [
    ...reachable.slice(3),
    ...ranked.filter((r) => r.listing.label === "Unclear"),
  ];
  const deadEnds = ranked.filter((r) => DEAD_END.includes(r.listing.label));

  return (
    <div className="page">
      <Header />
      <main>
        <section className="intro">
          <h1>Find a therapist who will actually pick up.</h1>
          <p className="lede">
            Finding care should be easier. We rank listings using public web
            pages, so you can call the likeliest offices first.
          </p>
        </section>

        <SearchForm insurer={insurer} city={city} collapsed={stats.total > 0} />

        {stats.total === 0 ? (
          <section className="empty">
            <p>
              {
                "We don't have listings for that insurer and city yet. Try Aetna in San Diego."
              }
            </p>
            <Link className="btn" href="/?insurer=Aetna&city=San+Diego">
              Show Aetna in San Diego
            </Link>
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
                    "If you've hit dead numbers before, it's not you. Insurer directories are often out of date."
                  }
                </p>
              </div>
            </section>

            <p className="progress">
              You narrowed {stats.total} listings to {stats.likelyAvailable}{" "}
              worth calling.
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
                  city={city}
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
                  city={city}
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
                  city={city}
                />
              </section>
            )}
          </>
        )}

        <p className="honest">
          <Icon name="info" />
          <span>Based on public web pages. Only the office can confirm.</span>
        </p>
      </main>
    </div>
  );
}
