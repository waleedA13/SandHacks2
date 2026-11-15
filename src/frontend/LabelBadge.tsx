import type { Label } from "@/shared/types";
import type { ReactNode } from "react";
import { Icon, PATHS, PHONE } from "./Icon";

type Style = [className: string, icon: ReactNode];

const CALL_OK: Style = [
  "badge-call-ok",
  <>
    {PHONE}
    <path d="M15 5l2 2 4-4" />
  </>,
];
const CALL_BAD: Style = [
  "badge-call-bad",
  <>
    {PHONE}
    <path d="M16 3l5 5M21 3l-5 5" />
  </>,
];

const STYLE: Record<Label, Style> = {
  "Likely available": ["badge-ok", PATHS.check],
  Unclear: ["badge-mid", PATHS.question],
  "Likely dead end": ["badge-bad", PATHS.cross],
  "Demo call: available": CALL_OK,
  "Demo call: unavailable": CALL_BAD,
  // Not a warning: they see self-pay clients at a posted fee.
  "Pay yourself": [
    "badge-neutral",
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>,
  ],
  // A user's own call reads the same as the demo call it replaces.
  "Caller reported: available": CALL_OK,
  "Caller reported: unavailable": CALL_BAD,
};

export const LABELS = Object.keys(STYLE) as Label[];

export function LabelBadge({ label }: { label: Label }) {
  const [className, icon] = STYLE[label];
  return (
    <span className={`badge ${className}`}>
      <Icon>{icon}</Icon>
      {label}
    </span>
  );
}
