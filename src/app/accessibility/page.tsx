import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Accessibility" };

// Keeps lines under about 70 characters.
const narrow = { maxWidth: "40rem" };
const list = { margin: 0, paddingLeft: "1.25em" };

export default function Accessibility() {
  return (
    <main id="main" style={narrow}>
      <Link className="link back" href="/">
        <span aria-hidden="true">←</span> Back to search
      </Link>

      {/* One long word: break it rather than scroll sideways at 320px and 200% text. */}
      <h1 style={{ hyphens: "auto", overflowWrap: "anywhere" }}>
        Accessibility
      </h1>
      <p className="lede">
        TheraCheck should work for someone with low vision on an older phone,
        and for someone on a slow connection.
      </p>

      <section className="panel" aria-labelledby="target-h">
        <h2 id="target-h">Our target</h2>
        <p>We aim to meet WCAG level AA.</p>
      </section>

      <section className="panel" aria-labelledby="done-h">
        <h2 id="done-h">What we checked</h2>
        <ul style={list}>
          <li>
            Text grows with your browser&apos;s text size. At 200%, nothing
            overlaps or gets cut off.
          </li>
          <li>
            You can use every page with a keyboard. Focus always shows, and the
            first Tab stop is &ldquo;Skip to main content&rdquo;.
          </li>
          <li>Text contrast is 5.8:1 or higher. AA asks for 4.5:1.</li>
          <li>Labels use words and icons, not color alone.</li>
          <li>Buttons and menu links are at least 44 pixels tall.</li>
          <li>
            Search and listing pages work with JavaScript turned off. Calls and
            the voice helper need it.
          </li>
        </ul>
        <p>
          We checked the search results and listing pages on 14 November 2026,
          in desktop Chrome at widths from 320 to 1280 pixels. Lighthouse gave
          both an accessibility score of 100.
        </p>
      </section>

      <section className="panel" aria-labelledby="gaps-h">
        <h2 id="gaps-h">What we haven&apos;t tested</h2>
        <ul style={list}>
          <li>Real screen readers: VoiceOver and TalkBack</li>
          <li>Real iPhones, Android phones and older phones</li>
          <li>Safari and Firefox on a computer</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="report-h">
        <h2 id="report-h">Report a problem</h2>
        <p>
          Open an issue on{" "}
          <a href="https://github.com/waleedA13/TheraCheck/issues">GitHub</a>.
          Tell us the page, your device and what went wrong.
        </p>
      </section>
    </main>
  );
}
