import { FitFilters, type FitValues } from "./FitFilters";
import { Icon } from "./Icon";
import { Select } from "./Select";

export const INSURERS = ["Aetna"];
export const CITIES = [
  "San Diego",
  "Los Angeles",
  "San Francisco",
  "San Jose",
  "Sacramento",
  "Fresno",
];

const asOptions = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

function Fields({ insurer, city }: { insurer: string; city: string }) {
  return (
    <>
      <Select
        id="insurer"
        label="Insurance company"
        options={asOptions(INSURERS)}
        value={insurer}
      />
      <Select id="city" label="City" options={asOptions(CITIES)} value={city} />
    </>
  );
}

// A plain GET form, so search works without JavaScript and results can be shared by link.
// With results on screen, insurer and city fold into a pill (native <details> opens without
// JavaScript) and the fit filters sit below it in the same form.
export function SearchForm({
  insurer,
  city,
  collapsed,
  fit,
  languages = [],
}: {
  insurer: string;
  city: string;
  collapsed: boolean;
  fit?: FitValues;
  languages?: string[];
}) {
  if (!collapsed)
    return (
      <form
        className="search"
        action="/"
        role="search"
        aria-label="Find therapists"
      >
        <Fields insurer={insurer} city={city} />
        <button className="btn" type="submit">
          Show therapists
        </button>
      </form>
    );
  return (
    <form
      className="search-wrap"
      action="/"
      role="search"
      aria-label="Find therapists"
    >
      <details className="search-pill">
        <summary>
          <span>
            <b>{insurer}</b> <span aria-hidden="true">·</span> {city}{" "}
            <span aria-hidden="true">·</span>{" "}
            <span className="muted">Change</span>
          </span>
          <i>
            <Icon name="search" size={18} />
          </i>
        </summary>
        <div className="search">
          <Fields insurer={insurer} city={city} />
          <button className="btn" type="submit">
            Show therapists
          </button>
        </div>
      </details>
      <FitFilters values={fit ?? {}} languages={languages} />
    </form>
  );
}
