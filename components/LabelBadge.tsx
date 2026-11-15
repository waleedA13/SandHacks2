import type { Label } from "@/lib/types";
import type { ReactNode } from "react";
import { Icon, PHONE } from "./Icon";

const STYLE: Record<Label, [className: string, icon: ReactNode]> = {
  "Likely available": [
    "badge-ok",
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>,
  ],
  Unclear: [
    "badge-mid",
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.2 9a3 3 0 0 1 5.6 1c0 2-3 2.5-3 4M12 17.5h.01" />
    </>,
  ],
  "Likely dead end": [
    "badge-bad",
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>,
  ],
  "Demo call: available": [
    "badge-call-ok",
    <>
      {PHONE}
      <path d="M15 5l2 2 4-4" />
    </>,
  ],
  "Demo call: unavailable": [
    "badge-call-bad",
    <>
      {PHONE}
      <path d="M16 3l5 5M21 3l-5 5" />
    </>,
  ],
};

export function LabelBadge({ label }: { label: Label }) {
  const [className, icon] = STYLE[label];
  return (
    <span className={`badge ${className}`}>
      <Icon>{icon}</Icon>
      {label}
    </span>
  );
}
