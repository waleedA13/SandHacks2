"use client";

import { Header } from "@/frontend/Header";

export default function Error({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="page">
      <Header />
      <main>
        <section className="empty" role="alert">
          <p>
            {
              "We couldn't load the listings. Check your connection, then try again."
            }
          </p>
          <button className="btn" type="button" onClick={() => retry()}>
            Try again
          </button>
        </section>
      </main>
    </div>
  );
}
