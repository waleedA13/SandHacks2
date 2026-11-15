import type { Detail } from "@/backend/queries";
import type { EvidenceSource } from "@/shared/types";
import { checkedDate } from "./format";

const NAME: Record<EvidenceSource, string> = {
  psychology_today: "Psychology Today",
  practice_site: "Practice website",
  zocdoc: "Zocdoc",
  headway: "Headway",
  license_board: "California licence board",
};

function excerpt(text: string) {
  if (text.length <= 160) return text;
  return `${text.slice(0, 160).replace(/\s+\S*$/, "")}…`;
}

// Evidence URLs come from scraped pages; only link plain web addresses.
function isWebUrl(url: string) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function SourceList({ evidence }: { evidence: Detail["evidence"] }) {
  return (
    <ul className="sources">
      {evidence.map((e) => (
        <li key={`${e.url}|${e.fetchedAt}`} className="source">
          <p className="source-name">{NAME[e.source] ?? e.source}</p>
          <p>&ldquo;{excerpt(e.rawText)}&rdquo;</p>
          <p className="muted">Fetched {checkedDate(e.fetchedAt)}</p>
          {isWebUrl(e.url) && (
            <a
              className="link"
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the {NAME[e.source] ?? "source"} page (opens in a new tab)
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
