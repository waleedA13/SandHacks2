import { Icon } from "./Icon";

export const INSURERS = ["Aetna"];
export const CITIES = [
  "San Diego",
  "Los Angeles",
  "San Francisco",
  "San Jose",
  "Sacramento",
  "Fresno",
];

function Select({
  id,
  label,
  options,
  value,
}: {
  id: string;
  label: string;
  options: string[];
  value: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="select">
        <select id={id} name={id} defaultValue={value}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </div>
  );
}

// A plain GET form, so search works without JavaScript and results can be shared by link.
function Form({ insurer, city }: { insurer: string; city: string }) {
  return (
    <form
      className="search"
      action="/"
      role="search"
      aria-label="Find therapists"
    >
      <Select id="insurer" label="Insurer" options={INSURERS} value={insurer} />
      <Select id="city" label="City" options={CITIES} value={city} />
      <button className="btn" type="submit">
        Show therapists
      </button>
    </form>
  );
}

// With results on screen, the form folds into a pill. Native <details> opens without JavaScript.
export function SearchForm({
  insurer,
  city,
  collapsed,
}: {
  insurer: string;
  city: string;
  collapsed: boolean;
}) {
  if (!collapsed) return <Form insurer={insurer} city={city} />;
  return (
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
      <Form insurer={insurer} city={city} />
    </details>
  );
}
