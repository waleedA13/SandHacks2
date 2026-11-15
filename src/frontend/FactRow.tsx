import type { LicenseStatus, Tri } from "@/shared/types";
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

// Never call anyone "unlicensed": a missing match may be our search, not their license.
const LICENSE: Record<
  LicenseStatus,
  [text: string, className: string, icon: keyof typeof PATHS]
> = {
  active: ["California license: active", "fact-yes", "check"],
  inactive: ["California license: not active", "fact-no", "warning"],
  not_found: ["We could not match a license record.", "fact-neutral", "info"],
  unchecked: ["We could not match a license record.", "fact-neutral", "info"],
};

function BoardLink({ url, children }: { url: string; children: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function LicenseRow({
  status,
  discipline,
  boardUrl,
}: {
  status: LicenseStatus;
  discipline: Tri;
  boardUrl?: string;
}) {
  const [text, className, icon] = LICENSE[status];
  return (
    <div className="fact">
      <dt>Licensed in California?</dt>
      <dd className={className}>
        <Icon name={icon} size={22} />
        {status === "active" && boardUrl ? (
          <BoardLink url={boardUrl}>{text}</BoardLink>
        ) : (
          text
        )}
      </dd>
      {discipline === "yes" && (
        <dd className="fact-note">
          The board lists a disciplinary action.{" "}
          {boardUrl ? (
            <BoardLink url={boardUrl}>See the board&apos;s record.</BoardLink>
          ) : (
            "See the board's record."
          )}
        </dd>
      )}
    </div>
  );
}
