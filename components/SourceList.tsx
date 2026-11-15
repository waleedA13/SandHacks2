import type { Detail } from "@/lib/queries";
import type { EvidenceSource } from "@/lib/types";
import { checkedDate } from "./ListingCard";

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

export function SourceList({ evidence }: { evidence: Detail["evidence"] }) {
  return (
    <ul className="sources">
      {evidence.map((e) => (
        <li key={e.url} className="source">
          <p className="source-name">{NAME[e.source] ?? e.source}</p>
          <p>&ldquo;{excerpt(e.rawText)}&rdquo;</p>
          <p className="muted">Fetched {checkedDate(e.fetchedAt)}</p>
          <a
            className="link"
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the {NAME[e.source] ?? "source"} page (opens in a new tab)
          </a>
        </li>
      ))}
    </ul>
  );
}
