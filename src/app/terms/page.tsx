import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

// Keeps lines under about 70 characters.
const narrow = { maxWidth: "40rem" };

export default function Terms() {
  return (
    <main id="main" style={narrow}>
      <Link className="link back" href="/">
        <span aria-hidden="true">←</span> Back to search
      </Link>

      <h1>Terms</h1>
      <p className="lede">
        Written by the TheraCheck team for a hackathon. Not reviewed by a
        lawyer.
      </p>

      <section className="panel" aria-labelledby="crisis-h">
        <h2 id="crisis-h">If you need help now</h2>
        <p>
          In a crisis, call or text <a href="tel:988">988</a>.
        </p>
        <p>
          In an emergency, call <a href="tel:911">911</a>.
        </p>
      </section>

      <section className="panel" aria-labelledby="what-h">
        <h2 id="what-h">What TheraCheck shows</h2>
        <p>
          TheraCheck shows information from public web pages. It can be wrong or
          out of date. Only the office can confirm.
        </p>
        <p>
          It is not medical advice, not a referral, and not your insurance
          company. A listing here doesn&apos;t promise that your plan covers a
          therapist or what a visit will cost.
        </p>
      </section>

      <section className="panel" aria-labelledby="calls-h">
        <h2 id="calls-h">Phone calls</h2>
        <p>
          Assistant calls are demos that only ring our team&apos;s phones. When
          you call yourself, you reach the real office.
        </p>
      </section>

      <section className="panel" aria-labelledby="as-is-h">
        <h2 id="as-is-h">No guarantee</h2>
        <p>
          TheraCheck is a SanD Hacks 2026 project. We offer it as is, with no
          guarantee it will stay online.
        </p>
      </section>
    </main>
  );
}
