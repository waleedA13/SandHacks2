import type { Tri } from "@/lib/types";
import { Icon, PATHS } from "./Icon";

const ANSWER: Record<
  Tri,
  [text: string, className: string, icon: keyof typeof PATHS]
> = {
  yes: ["Yes", "fact-yes", "check"],
  no: ["No", "fact-no", "cross"],
  unknown: ["We couldn't tell", "fact-unknown", "question"],
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
        <Icon name={icon} size={22} />
        {text}
      </dd>
    </div>
  );
}
