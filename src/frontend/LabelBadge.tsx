import type { Label } from "@/shared/types";
import type { ReactNode } from "react";
import { Icon, PATHS, PHONE } from "./Icon";

const STYLE: Record<Label, [className: string, icon: ReactNode]> = {
  "Likely available": ["badge-ok", PATHS.check],
  Unclear: ["badge-mid", PATHS.question],
  "Likely dead end": ["badge-bad", PATHS.cross],
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
