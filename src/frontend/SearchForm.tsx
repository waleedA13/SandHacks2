import { FitFilters, type FitValues } from "./FitFilters";
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
// With results on screen, insurer and city fold into a pill (native <details> opens without
// JavaScript) and the fit filters sit below it in the same form.
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
  return (
    <form
      className="search-wrap"
      action="/"
      role="search"
      aria-label="Find therapists"
    >
      <div className="search-row">
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
          <div className="search search-main">
            <Fields insurer={insurer} city={city} options={options} />
            <button className="btn" type="submit">
              Show therapists
            </button>
          </div>
        </details>
        <FitFilters values={fit ?? {}} languages={languages} />
      </div>
    </form>
  );
}
