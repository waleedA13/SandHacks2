"use client";

import { useState, useSyncExternalStore } from "react";
import type { ListingSummary } from "@/shared/types";
import { Icon } from "./Icon";

type Top = Pick<ListingSummary, "id" | "name" | "label" | "phone">;

export function shareText(
  insurer: string,
  city: string,
  top: Top[],
  url: string,
) {
  return [
    `Therapists most likely to pick up (${insurer}, ${city})`,
    ...top.map(
      (l, i) =>
        `${i + 1}. ${l.name}: ${l.label}, ${l.phone ?? "no phone number listed"}`,
    ),
    url,
  ].join("\n");
}

// null on the server and during hydration, then whether this browser has a share sheet.
const noSubscribe = () => () => {};
const useCanShare = () =>
  useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => null,
  );

// Everything happens on the device: no network calls, nothing stored.
export function ShareShortlist({
  insurer,
  city,
  top,
  url,
}: {
  insurer: string;
  city: string;
  top: Top[];
  url: string;
}) {
  const canShare = useCanShare();
  const [status, setStatus] = useState("");
  const text = shareText(insurer, city, top, url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy. You can copy the link from the address bar.");
    }
  }

  return (
    <section className="share" aria-label="Share these results">
      <noscript>
        <style>{".share-js { display: none; }"}</style>
        <p className="no-js share-link">
          Share these results with this link: {url}
        </p>
      </noscript>
      <div className="share-js">
        {canShare ? (
          <button
            className="btn"
            type="button"
            onClick={() =>
              // A closed share sheet rejects; there is nothing to do.
              navigator.share({ text }).catch(() => {})
            }
          >
            <Icon name="share" size={18} />
            Send me the top 3
          </button>
        ) : (
          canShare === false && (
            <>
              <p className="share-title">Send me the top 3</p>
              <button className="btn" type="button" onClick={copy}>
                Copy
              </button>
              <a
                className="btn btn-outline"
                href={`sms:?&body=${encodeURIComponent(text)}`}
              >
                Text it to me
              </a>
            </>
          )
        )}
        <button
          className="link print"
          type="button"
          onClick={() => window.print()}
        >
          Print
        </button>
        <p className="share-status" role="status">
          {status}
        </p>
      </div>
    </section>
  );
}
