import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main">
      <section className="empty">
        <h1>We couldn&apos;t find that listing.</h1>
        <p>It may have been removed, or the link is wrong.</p>
        <Link className="btn" href="/">
          Go to the search page
        </Link>
      </section>
    </main>
  );
}
