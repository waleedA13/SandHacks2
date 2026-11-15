"use client";

import { sendReport, type ReportState } from "@/app/listing/[id]/actions";
import { LABELS } from "@/frontend/LabelBadge";
import type { Label } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useActionState, useId, useState, type FormEvent } from "react";
import { useSetLabel } from "./CallPanel";
import { Icon } from "./Icon";
import { telHref } from "./format";

const NOTES: Record<Exclude<ReportState, null>, string> = {
  sent: "Thanks. Your report is saved and the label is updated.",
  too_soon:
    "Thanks, we already have a report for this listing. Try again in a minute.",
  error: "Could not send your report. Try again in a moment.",
};

export function CallYourself({
  listingId,
  name,
  phone,
  askPlan,
  selfPay = false,
}: {
  listingId: string;
  name: string;
  phone: string;
  // "Aetna Open Access", as the office would say it.
  askPlan: string;
  // Labelled "Pay yourself": ask about self-pay, not about the insurer.
  selfPay?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const setLabel = useSetLabel();
  // Without JavaScript the form posts to this server action and the page re-renders with its state.
  const [posted, formAction] = useActionState(
    sendReport.bind(null, listingId),
    null,
  );
  const [sent, setSent] = useState<ReportState>(null);
  const [sending, setSending] = useState(false);
  const note = sent ?? posted;

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const answered = form.get("answered");
    if (answered !== "yes" && answered !== "no") return;
    setSending(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answered,
          acceptingNew:
            answered === "yes"
              ? (form.get("acceptingNew") ?? "unknown")
              : "unknown",
        }),
      });
      if (res.ok) {
        const { label } = (await res.json()) as { label: unknown };
        if ((LABELS as unknown[]).includes(label)) setLabel(label as Label);
        router.refresh();
      }
      setSent(res.ok ? "sent" : res.status === 429 ? "too_soon" : "error");
    } catch {
      setSent("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="call-yourself">
      <a className="btn" href={telHref(phone)}>
        <Icon name="phone" size={18} />
        Call {phone}
      </a>
      <div className="say">
        <p id={`${id}-say`}>What to say:</p>
        <ol aria-labelledby={`${id}-say`}>
          {selfPay ? (
            <>
              <li>
                &ldquo;Hi, I&apos;m looking for a therapist. Do you have
                openings for clients who pay for themselves?&rdquo;
              </li>
              <li>&ldquo;What do you charge per session?&rdquo;</li>
            </>
          ) : (
            <>
              <li>
                &ldquo;Hi, I&apos;m looking for a therapist. Do you take{" "}
                {askPlan}?&rdquo;
              </li>
              <li>&ldquo;Is {name} taking new patients?&rdquo;</li>
            </>
          )}
          <li>&ldquo;What&apos;s the earliest appointment?&rdquo;</li>
        </ol>
      </div>
      <form
        className="report"
        // React renders a function action's method as "POST"; match it so hydration agrees.
        method="POST"
        action={formAction}
        onSubmit={send}
        aria-labelledby={`${id}-after`}
      >
        <p id={`${id}-after`} className="report-title">
          After the call, tell us what happened. It updates this listing for the
          next person.
        </p>
        <fieldset>
          <legend>Did they answer?</legend>
          <div className="choices">
            <Choice name="answered" value="yes" label="Yes" required />
            <Choice name="answered" value="no" label="No" required />
          </div>
        </fieldset>
        {/* Shown by CSS once "Yes" is picked, so it works without JavaScript too. */}
        <fieldset className="report-accepting">
          <legend>Are they taking new patients?</legend>
          <div className="choices">
            <Choice name="acceptingNew" value="yes" label="Yes" />
            <Choice name="acceptingNew" value="no" label="No" />
            <Choice name="acceptingNew" value="unknown" label="Not sure" />
          </div>
        </fieldset>
        <button className="btn" type="submit" disabled={sending}>
          Send
        </button>
        <p role="status" className="report-note">
          {note && NOTES[note]}
        </p>
      </form>
    </div>
  );
}

function Choice({
  name,
  value,
  label,
  required,
}: {
  name: string;
  value: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="check choice">
      <input type="radio" name={name} value={value} required={required} />
      <span>{label}</span>
    </label>
  );
}
