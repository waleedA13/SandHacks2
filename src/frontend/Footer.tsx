import Link from "next/link";
import { Icon } from "@/frontend/Icon";

export function Footer() {
  return (
    <footer className="site-footer">
      <nav className="foot-nav" aria-label="Footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/accessibility">Accessibility</Link>
      </nav>
      <p className="honest">
        <Icon name="info" />
        <span>Based on public web pages. Only the office can confirm.</span>
      </p>
      <p>
        Assistant calls are demos to our team&apos;s phones. When you call
        yourself, you reach the real office.
      </p>
      <p>
        TheraCheck is a SanD Hacks 2026 project.{" "}
        <a className="link" href="https://github.com/waleedA13/TheraCheck">
          Source on GitHub
        </a>
      </p>
    </footer>
  );
}
