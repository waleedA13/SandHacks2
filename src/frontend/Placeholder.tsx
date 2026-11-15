import Link from "next/link";

export function Placeholder({ title }: { title: string }) {
  return (
    <main id="main">
      <section className="empty">
        <h1>{title}</h1>
        <p>This page is being written.</p>
        <Link className="btn" href="/">
          Back to search
        </Link>
      </section>
    </main>
  );
}
