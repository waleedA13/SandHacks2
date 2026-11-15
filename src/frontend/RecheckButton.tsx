"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { checkedDate } from "./format";

export const POLL_MS = 2_000;
export const GIVE_UP_MS = 120_000;

type Phase = "idle" | "checking" | "done" | "failed";

// Waits, but stops at once when the check is given up or the page is left.
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason);
      },
      { once: true },
    );
  });

async function runCheck(listingId: string, signal: AbortSignal) {
  const res = await fetch(`/api/listings/${listingId}/recheck`, {
    method: "POST",
    signal,
  });
  if (!res.ok) return false;
  const { jobId } = (await res.json()) as { jobId: string };
  for (;;) {
    await wait(POLL_MS, signal);
    const job = await fetch(`/api/jobs/${jobId}`, { signal });
    if (!job.ok) return false;
    const { status } = (await job.json()) as { status: string };
    if (status === "done") return true;
    if (status === "failed") return false;
  }
}

// The old result stays on the page the whole time; only router.refresh() replaces it.
export function RecheckButton({
  listingId,
  checkedAt,
}: {
  listingId: string;
  checkedAt: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const running = useRef<AbortController | null>(null);

  // Leaving the page stops the polling.
  useEffect(() => () => running.current?.abort(), []);

  async function check() {
    // A ref, not state: a second click in the same tick must not post again.
    if (running.current) return;
    const ac = new AbortController();
    running.current = ac;
    const giveUp = setTimeout(() => ac.abort(), GIVE_UP_MS);
    setPhase("checking");
    let ok = false;
    try {
      ok = await runCheck(listingId, ac.signal);
    } catch {
      // Network error, or 120 seconds passed.
    }
    clearTimeout(giveUp);
    running.current = null;
    setPhase(ok ? "done" : "failed");
    if (ok) router.refresh();
  }

  const checking = phase === "checking";
  const status = {
    idle: "",
    checking: "Checking now. This takes about a minute.",
    done: "Done. The result above is new.",
    failed: checkedAt
      ? `We couldn't check right now. Showing the last result from ${checkedDate(checkedAt)}.`
      : "We couldn't check right now.",
  }[phase];

  return (
    <div className="recheck">
      {/* The check needs JavaScript; without it the button would do nothing. */}
      <noscript>
        <style>{".recheck { display: none; }"}</style>
      </noscript>
      <button
        type="button"
        className="btn btn-outline"
        // aria-disabled, not disabled, so keyboard focus stays on the button.
        aria-disabled={checking}
        onClick={check}
      >
        Check again now
      </button>
      <p className="recheck-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
