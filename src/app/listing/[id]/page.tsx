import Link from "next/link";
import { notFound } from "next/navigation";
import { CallPanel, LabelProvider, LiveBadge } from "@/frontend/CallPanel";
import { FactRow, LicenseRow } from "@/frontend/FactRow";
import { Header } from "@/frontend/Header";
import { Icon } from "@/frontend/Icon";
import { checkedDate, priceText, telHref } from "@/frontend/format";
import { first } from "@/frontend/params";
import { isWebUrl, SourceList } from "@/frontend/SourceList";
import { getDetail } from "@/backend/queries";

// Same as the home page: block until the data is ready so the page works without JavaScript.
export const instant = false;

const NO_INFO = "We found no other information about this listing.";

// Some verdicts already give this as their reason; don't say it twice.
const saysNoInfo = (reason?: string) =>
  /^we found no other information/i.test(reason?.trim() ?? "");

function backHref(insurer?: string, city?: string) {
  if (!insurer && !city) return "/";
  const q = new URLSearchParams();
  if (insurer) q.set("insurer", insurer);
  if (city) q.set("city", city);
  return `/?${q}`;
}

export default async function ListingPage({
  params,
  searchParams,
}: PageProps<"/listing/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getDetail(id);
  if (!detail) notFound();

  const { listing, verdict, label, evidence, calls } = detail;
  const lastCall = calls.find((c) => c.status === "done") ?? null;
  const back = backHref(first(query.insurer), first(query.city));
  const boardUrl = evidence.find(
    (e) => e.source === "license_board" && isWebUrl(e.url),
  )?.url;
  const price = priceText(
    verdict?.selfPayMin ?? null,
    verdict?.selfPayMax ?? null,
  );

  return (
    <div className="page">
      <Header />
      <LabelProvider key={listing.id}>
        <main id="main" className="detail">
          <Link className="link back" href={back}>
            <span aria-hidden="true">←</span> Back to results
          </Link>

          <section className="panel detail-top" aria-labelledby="name-h">
            <LiveBadge label={label} />
            <h1 id="name-h">
              {listing.name}
              {listing.credential && (
                <span className="cred">, {listing.credential}</span>
              )}
            </h1>
            {listing.address && <p className="muted">{listing.address}</p>}
            {listing.phone ? (
              <a
                className="btn call"
                href={telHref(listing.phone)}
                aria-label={`Call ${listing.name} at ${listing.phone}`}
              >
                <Icon name="phone" size={18} />
                {listing.phone}
              </a>
            ) : (
              <p className="muted no-phone">No phone number listed</p>
            )}
            {price ? (
              <div>
                <p className="price">Their posted price: {price}</p>
                <p className="muted">
                  {
                    "This is the therapist's own price if you pay yourself. It is not what your insurance charges."
                  }
                </p>
              </div>
            ) : (
              <p className="muted">No price posted</p>
            )}
          </section>

          <section className="panel" aria-labelledby="why-h">
            <h2 id="why-h">Why it ranks here</h2>
            {verdict ? (
              <>
                <p className="reason">{verdict.reason}</p>
                <p className="muted">
                  Last checked {checkedDate(verdict.checkedAt)}
                </p>
              </>
            ) : (
              <p className="reason">Not checked yet</p>
            )}
          </section>

          {evidence.length > 0 ? (
            <>
              <section className="panel" aria-labelledby="found-h">
                <h2 id="found-h">What we found</h2>
                <dl className="facts">
                  <FactRow
                    question="Still seeing patients here?"
                    answer={verdict?.stillPractising ?? "unknown"}
                  />
                  <FactRow
                    question="Takes this insurance?"
                    answer={verdict?.listsInsurer ?? "unknown"}
                  />
                  <FactRow
                    question="Taking new patients?"
                    answer={verdict?.acceptingNew ?? "unknown"}
                  />
                  <LicenseRow
                    status={verdict?.licenseStatus ?? "unchecked"}
                    discipline={verdict?.licenseDiscipline ?? "unknown"}
                    boardUrl={boardUrl}
                  />
                </dl>
              </section>

              <section className="panel" aria-labelledby="sources-h">
                <h2 id="sources-h">Sources</h2>
                <SourceList evidence={evidence} />
              </section>
            </>
          ) : (
            // Some verdicts already say this as their reason; don't repeat it.
            !saysNoInfo(verdict?.reason) && <p className="panel">{NO_INFO}</p>
          )}

          <section className="panel" aria-labelledby="call-h">
            <h2 id="call-h">Confirm by phone</h2>
            <CallPanel
              listingId={listing.id}
              name={listing.name}
              insurer={listing.insurer}
              hasPhone={Boolean(listing.phone)}
              lastCall={lastCall}
            />
          </section>

          <p className="honest">
            <Icon name="info" />
            <span>Based on public web pages. Only the office can confirm.</span>
          </p>
        </main>
      </LabelProvider>
    </div>
  );
}
