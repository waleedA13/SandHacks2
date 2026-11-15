import type { Tri } from "@/lib/types";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

const ANSWER: Record<Tri, [text: string, className: string, icon: ReactNode]> =
  {
    yes: ["Yes", "fact-yes", <path key="y" d="M8 12.5l2.5 2.5L16 9.5" />],
    no: ["No", "fact-no", <path key="n" d="M9 9l6 6M15 9l-6 6" />],
    unknown: [
      "We couldn't tell",
      "fact-unknown",
      <path key="u" d="M9.2 9a3 3 0 0 1 5.6 1c0 2-3 2.5-3 4M12 17.5h.01" />,
    ],
  };

export function FactRow({
  question,
  answer,
}: {
  question: string;
  answer: Tri;
}) {
  const [text, className, icon] = ANSWER[answer];
  return (
    <div className="fact">
      <dt>{question}</dt>
      <dd className={className}>
        <Icon size={22}>
          <circle cx="12" cy="12" r="10" />
          {icon}
        </Icon>
        {text}
      </dd>
    </div>
  );
}
