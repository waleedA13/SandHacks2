import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

// Keeps lines under about 70 characters.
const narrow = { maxWidth: "40rem" };
const list = { margin: 0, paddingLeft: "1.25em" };

export default function Privacy() {
  return (
    <main id="main" style={narrow}>
      <Link className="link back" href="/">
        <span aria-hidden="true">←</span> Back to search
      </Link>

      <h1>Privacy</h1>
      <p className="lede">
        Written by the TheraCheck team for a hackathon. Not reviewed by a
        lawyer.
      </p>

      <section className="panel" aria-labelledby="never-h">
        <h2 id="never-h">What we never collect</h2>
        <p>
          You don&apos;t make an account or sign in. TheraCheck sets no cookies
          and has no ads or tracking scripts.
        </p>
        <p>
          Your search, the insurance company and city or ZIP code, sits in the
          page address. You can bookmark it or share it.
        </p>
      </section>

      <section className="panel" aria-labelledby="keep-h">
        <h2 id="keep-h">What we keep</h2>
        <ul style={list}>
          <li>
            <strong>&ldquo;Did they answer?&rdquo; reports.</strong> We save
            your answers, the time and the listing. We save nothing about who
            sent the report.
          </li>
          <li>
            <strong>Assistant calls to an office.</strong> The assistant first
            says it is an AI voice from TheraCheck and that the call is
            transcribed. We save the office&apos;s two answers and a
            one-sentence summary. No audio of the call is saved.
          </li>
          <li>
            <strong>Our do-not-call list.</strong> An office can ask not to be
            called on any assistant call. We add its number to the list, and the
            assistant won&apos;t call it again.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="device-h">
        <h2 id="device-h">What stays on your device</h2>
        <p>
          &ldquo;Copy&rdquo;, &ldquo;Text it to me&rdquo; and &ldquo;Send me the
          top 3&rdquo; use your own clipboard, messaging app or share menu.
          Nothing goes to us.
        </p>
      </section>

      <section className="panel" aria-labelledby="others-h">
        <h2 id="others-h">What other services see</h2>
        <ul style={list}>
          <li>
            <strong>Talking to the helper.</strong> Your voice goes from your
            browser to ElevenLabs, our voice provider, which keeps a transcript.
            TheraCheck doesn&apos;t store your voice or the transcript.
          </li>
          <li>
            <strong>&ldquo;Check and connect me&rdquo;.</strong> Your phone
            number goes to ElevenLabs and Twilio to place the call. TheraCheck
            doesn&apos;t store it. ElevenLabs keeps it with the call record for
            its retention period.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="services-h">
        <h2 id="services-h">Services we use</h2>
        <ul style={list}>
          <li>Vercel hosts the site and keeps its server logs.</li>
          <li>Neon holds our database.</li>
          <li>
            Google Gemini reads the public web pages we collect. It never sees
            what you type.
          </li>
          <li>Bright Data collects those public web pages.</li>
          <li>
            ElevenLabs runs the voice assistant. Twilio places phone calls and
            tells us if an office number is a landline.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="questions-h">
        <h2 id="questions-h">Questions</h2>
        <p>
          Open an issue on{" "}
          <a href="https://github.com/waleedA13/TheraCheck/issues">GitHub</a>.
        </p>
      </section>
    </main>
  );
}
