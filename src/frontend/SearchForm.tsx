import { FitFields, fitSummary, type FitValues } from "./FitFilters";
import { Icon } from "./Icon";
import { Select } from "./Select";

export type SearchOptions = { insurers: string[]; cities: string[] };

const asOptions = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

function Fields({
  insurer,
  city,
  options,
}: {
  insurer: string;
  city: string;
  options: SearchOptions;
}) {
  return (
    <>
      <Select
        id="insurer"
        label="Insurance company"
        options={asOptions(options.insurers)}
        value={insurer}
      />
      <div className="field">
        <label htmlFor="city">City or ZIP code</label>
        <input
          className="text-input"
          id="city"
          name="city"
          type="text"
          autoComplete="address-level2"
          list="city-options"
          maxLength={60}
          defaultValue={city}
          aria-describedby="city-hint"
        />
        <datalist id="city-options">
          {options.cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <span className="hint" id="city-hint">
          For example San Diego or 92103.
        </span>
      </div>
    </>
  );
}

// A plain GET form, so search works without JavaScript and results can be shared by link.
// With results on screen, the search and its filters fold into one pill (native <details>
// opens without JavaScript).
export function SearchForm({
  insurer,
  city,
  collapsed,
  options,
  fit,
  languages = [],
}: {
  insurer: string;
  city: string;
  options: SearchOptions;
  collapsed: boolean;
  fit?: FitValues;
  languages?: string[];
}) {
  if (!collapsed)
    return (
      <form
        className="search search-main"
        action="/"
        role="search"
        aria-label="Find therapists"
      >
        <Fields insurer={insurer} city={city} options={options} />
        <button className="btn" type="submit">
          Show therapists
        </button>
      </form>
    );
  const filters = fitSummary(fit ?? {});
  return (
    <form
      className="search-wrap"
      action="/"
      role="search"
      aria-label="Find therapists"
    >
      {/* One fold for the search and its filters; open while a filter is set. */}
      <details className="search-pill" open={filters.length > 0}>
        <summary>
          <span>
            <b>{insurer}</b> <span aria-hidden="true">·</span> {city}
            {filters.map((x) => (
              <span key={x}>
                {" "}
                <span aria-hidden="true">·</span> {x}
              </span>
            ))}{" "}
            <span aria-hidden="true">·</span>{" "}
            <span className="muted">Change</span>
          </span>
          <i>
            <Icon name="search" size={18} />
          </i>
        </summary>
        <div className="search search-main search-all">
          <Fields insurer={insurer} city={city} options={options} />
          <FitFields values={fit ?? {}} languages={languages} />
          <button className="btn" type="submit">
            Show therapists
          </button>
        </div>
      </details>
    </form>
  );
}
