"use client";

import type { Call, Label } from "@/shared/types";
import { useRouter } from "next/navigation";
import { createContext, use, useState, type ReactNode } from "react";
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
    <div aria-live="polite" className="live-badge">
      <LabelBadge label={fresh ?? label} />
    </div>
  );
}

export function CallPanel({
  listingId,
  name,
  insurer,
  lastCall,
}: {
  listingId: string;
  name: string;
  insurer: string;
  lastCall: Pick<Call, "summary" | "calledAt"> | null;
}) {
  const router = useRouter();
  const [, setFresh] = use(LabelState) ?? [null, () => {}];

  return (
    <div className="call-panel">
      <p>Our assistant will ask the office two questions for you.</p>
      {lastCall && (
        <div className="last-call">
          <p>
            Demo call on {checkedDate(lastCall.calledAt)}
            {lastCall.summary
              ? `: ${lastCall.summary.replace(/^Demo call:\s*/i, "")}`
              : "."}
          </p>
          <p className="demo">
            <Icon name="info" />
            <span>No real office was contacted.</span>
          </p>
        </div>
      )}
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
    </div>
  );
}
