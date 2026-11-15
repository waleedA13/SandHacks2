"use client";

import type { BookingPath, Call, Label } from "@/shared/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon } from "./Icon";
import { LABELS, LabelBadge } from "./LabelBadge";
import { checkedDate } from "./format";
import { VoiceWidget } from "./VoiceWidget";

// A call result replaces the badge at once; router.refresh() then brings the server's copy.
const LabelState = createContext<[Label | null, (l: Label) => void] | null>(
  null,
);

export function LabelProvider({ children }: { children: ReactNode }) {
  const state = useState<Label | null>(null);
  return <LabelState value={state}>{children}</LabelState>;
}

export function LiveBadge({ label }: { label: Label }) {
  const [fresh] = use(LabelState) ?? [null];
  return (
    <div aria-live="polite" aria-atomic="true" className="live-badge">
      {/* A new key only after a call or report, so the highlight never plays on page load. */}
      <span key={fresh ?? ""} className={fresh ? "badge-changed" : undefined}>
        <LabelBadge label={fresh ?? label} />
      </span>
    </div>
  );
}

// Sets the badge at once after a call or a report; router.refresh() then brings the server's copy.
export function useSetLabel() {
  return (use(LabelState) ?? [null, () => {}])[1];
}

export function LastCall({
  call,
}: {
  call: Pick<Call, "summary" | "calledAt">;
}) {
  return (
    <div className="last-call">
      <p>
        Demo call on {checkedDate(call.calledAt)}
        {call.summary
          ? `: ${call.summary.replace(/^Demo call:\s*/i, "")}`
          : "."}
      </p>
      <p className="demo">
        <Icon name="info" />
        <span>No real office was contacted.</span>
      </p>
    </div>
  );
}

export function CallPanel({
  listingId,
  name,
  insurer,
  hasPhone = false,
  lastCall,
  paths = [],
}: {
  listingId: string;
  name: string;
  insurer: string;
  hasPhone?: boolean;
  lastCall: Pick<Call, "summary" | "calledAt"> | null;
  paths?: BookingPath[];
}) {
  const router = useRouter();
  const setFresh = useSetLabel();

  return (
    <div className="call-panel">
      <p>Our assistant will ask the office two questions for you.</p>
      {lastCall && <LastCall call={lastCall} />}
      {/* Without JavaScript the call buttons do nothing, so hide them and say why. */}
      <noscript>
        <style>{".voice { display: none; }"}</style>
        <p className="no-js">
          The demo call needs JavaScript, which is turned off in your browser.
          {hasPhone && " You can still phone the office yourself."}
        </p>
      </noscript>
      <div className="voice">
        <VoiceWidget
          mode="confirm"
          listingId={listingId}
          name={name}
          insurer={insurer}
          onDone={({ label }) => {
            if ((LABELS as string[]).includes(label)) setFresh(label as Label);
            router.refresh();
          }}
        />
        {/* Only office landlines; POST /api/calls/start refuses the rest anyway. */}
        {paths.includes("agent_check") && <ConnectForm listingId={listingId} />}
      </div>
    </div>
  );
}

const CONSENT =
  "Call me at this number and connect me to the office. The assistant will leave once you're connected.";

// The patient's number stays in this form's state until the request is sent, then is cleared.
function ConnectForm({ listingId }: { listingId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [office, setOffice] = useState("");
  const [patient, setPatient] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");

  async function start(e: FormEvent) {
    e.preventDefault();
    if (!consent || !office || !patient) return;
    setSending(true);
    setNote("");
    const connectTo = patient;
    setPatient("");
    try {
      const res = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, toNumber: office, connectTo }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: unknown };
      setNote(
        res.ok
          ? "Calling the office. If they say yes to both questions, your phone will ring."
          : res.status === 403 && typeof body.error === "string"
            ? body.error
            : res.status === 429
              ? "A call started less than a minute ago. Try again shortly."
              : "Could not start the call. Try again in a moment.",
      );
    } catch {
      setNote("Could not start the call. Try again in a moment.");
    } finally {
      setSending(false);
      setConsent(false);
    }
  }

  return (
    <div style={{ ...form, marginTop: 12 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-form`}
        onClick={() => setOpen(!open)}
        style={button}
      >
        Check and connect me
      </button>
      {open && (
        // POST keeps the numbers out of the URL if the script ever fails to run.
        <form id={`${id}-form`} method="post" onSubmit={start} style={form}>
          <div className="field">
            <label htmlFor={`${id}-office`}>Office number for the demo</label>
            <input
              id={`${id}-office`}
              className="text-input"
              type="tel"
              autoComplete="off"
              aria-describedby={`${id}-office-hint`}
              required
              value={office}
              onChange={(e) => setOffice(e.target.value)}
            />
            <span id={`${id}-office-hint`} className="hint">
              A teammate&apos;s phone plays the office. No real office is
              called.
            </span>
          </div>
          <div className="field">
            <label htmlFor={`${id}-patient`}>Your phone number</label>
            <input
              id={`${id}-patient`}
              className="text-input"
              type="tel"
              autoComplete="tel"
              aria-describedby={`${id}-patient-hint`}
              required
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
            />
            <span id={`${id}-patient-hint`} className="hint">
              Used for this call only. We never save it.
            </span>
          </div>
          <label className="check">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{CONSENT}</span>
          </label>
          <button type="submit" disabled={sending} style={button}>
            Start the call
          </button>
          <p role="status" aria-live="polite" style={{ margin: 0 }}>
            {note}
          </p>
        </form>
      )}
    </div>
  );
}

// Same touch size as VoiceWidget's buttons; colour comes from .call-panel button.
const button = {
  minHeight: 48,
  padding: "0 20px",
  fontSize: "1.125rem",
  cursor: "pointer",
  justifySelf: "start",
} as const;

const form = { display: "grid", gap: 12, minWidth: 0 } as const;
