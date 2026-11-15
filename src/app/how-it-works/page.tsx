import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

// Keeps lines under about 70 characters.
const narrow = { maxWidth: "40rem" };
const list = { margin: 0, paddingLeft: "1.25em" };

export default function HowItWorks() {
  return (
    <main id="main" style={narrow}>
      <Link className="link back" href="/">
        <span aria-hidden="true">←</span> Back to search
      </Link>

      <h1>How it works</h1>
      <p className="lede">
        TheraCheck ranks the therapists on an insurance company&apos;s list by
        how likely each office is to answer and take new patients.
      </p>

      <section className="panel" aria-labelledby="list-h">
        <h2 id="list-h">Where the list comes from</h2>
        <p>
          We copied Cigna&apos;s public directory of licensed therapists for the
          Open Access Plus plan. It covers six California cities: San Diego, Los
          Angeles, San Francisco, San Jose, Sacramento and Fresno.
        </p>
      </section>

      <section className="panel" aria-labelledby="check-h">
        <h2 id="check-h">What we check</h2>
        <p>For each listing we look for public pages about the therapist:</p>
        <ul style={list}>
          <li>their Psychology Today profile</li>
          <li>their own website</li>
          <li>their Zocdoc or Headway booking page</li>
          <li>
            California&apos;s public license records, from the Department of
            Consumer Affairs
          </li>
        </ul>
        <p>We also look up whether the office number is a landline.</p>
      </section>

      <section className="panel" aria-labelledby="read-h">
        <h2 id="read-h">How we read the pages</h2>
        <p>
          An AI model, Google Gemini, reads those pages and answers four
          questions:
        </p>
        <ul style={list}>
          <li>Is the therapist still seeing patients at this office?</li>
          <li>Do they take this insurance?</li>
          <li>Are they taking new patients?</li>
          <li>Do they see clients who pay for themselves?</li>
        </ul>
        <p>
          Each answer is yes, no or &ldquo;we couldn&apos;t tell&rdquo;. When
          the pages don&apos;t say, the answer is &ldquo;we couldn&apos;t
          tell&rdquo;, not no.
        </p>
      </section>

      <section className="panel" aria-labelledby="score-h">
        <h2 id="score-h">The score</h2>
        <p>
          Every listing starts at 50 points. The first three answers move it:
        </p>
        <ul style={list}>
          <li>Still seeing patients here: yes +20, no −30</li>
          <li>Takes this insurance: yes +15, no −25</li>
          <li>Taking new patients: yes +15, no −25</li>
        </ul>
        <p>
          &ldquo;We couldn&apos;t tell&rdquo; adds nothing. The score stays
          between 0 and 100, and sets the label:
        </p>
        <ul style={list}>
          <li>70 or more: Likely available</li>
          <li>40 to 69: Unclear</li>
          <li>Under 40: Likely dead end</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="pay-h">
        <h2 id="pay-h">&ldquo;Pay yourself&rdquo;</h2>
        <p>
          Some therapists don&apos;t take your insurance but see clients who pay
          for themselves. We label them &ldquo;Pay yourself&rdquo; when their
          pages say both, and nothing says they stopped seeing patients. Their
          score stays the same, so the order of the list doesn&apos;t change.
        </p>
      </section>

      <section className="panel" aria-labelledby="calls-h">
        <h2 id="calls-h">Phone calls beat web pages</h2>
        <p>An answer from a phone call replaces the score:</p>
        <ul style={list}>
          <li>
            The office takes the insurance and is taking new patients:
            available, 100.
          </li>
          <li>The office says no to either question: unavailable, 0.</li>
          <li>Either answer unclear: the score stays as it was.</li>
        </ul>
        <p>The label says who made the call:</p>
        <ul style={list}>
          <li>
            &ldquo;Demo call&rdquo;: our AI assistant asked. For now it only
            calls our team, and a teammate plays the office.
          </li>
          <li>
            &ldquo;Caller reported&rdquo;: a person called the office and tapped
            what happened.
          </li>
        </ul>
        <p>
          Three &ldquo;nobody answered&rdquo; reports in 7 days mark a listing
          unavailable. Only reports since the office last answered count.
        </p>
      </section>

      <section className="panel" aria-labelledby="book-h">
        <h2 id="book-h">Three ways to book</h2>
        <ul style={list}>
          <li>
            <strong>Book online</strong> shows when we found a booking page for
            the therapist.
          </li>
          <li>
            <strong>Ask the assistant</strong> shows when the office number is a
            landline. The assistant asks the office two questions. If both
            answers are yes, it can connect you. It only calls landlines.
          </li>
          <li>
            <strong>Call yourself</strong> shows for any listing with a phone
            number. We give you a short script of what to ask.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="limits-h">
        <h2 id="limits-h">What we can&apos;t promise</h2>
        <p>
          When the public pages say little about a therapist, their listing
          shows &ldquo;Unclear&rdquo;. Pages can be out of date. Only the office
          can confirm that a therapist takes your insurance and has openings.
        </p>
      </section>
    </main>
  );
}
