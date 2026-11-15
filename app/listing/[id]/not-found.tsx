import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <div className="page">
      <Header />
      <main>
        <section className="empty">
          <h1>We couldn&apos;t find that listing.</h1>
          <p>It may have been removed, or the link is wrong.</p>
          <Link className="btn" href="/">
            Go to the search page
          </Link>
        </section>
      </main>
    </div>
  );
}
