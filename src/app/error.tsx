"use client";

export default function Error({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main id="main">
      <section className="empty" role="alert">
        <h1>{"We couldn't load the listings."}</h1>
        <p>Check your connection, then try again.</p>
        <button className="btn" type="button" onClick={() => retry()}>
          Try again
        </button>
      </section>
    </main>
  );
}
