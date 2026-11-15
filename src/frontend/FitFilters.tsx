import { first } from "./params";
import { Select } from "./Select";

// The plan's fixed specialties, in plain words.
export const SPECIALTIES: Record<string, string> = {
  anxiety: "Anxiety",
  depression: "Depression",
  trauma: "Trauma",
  grief: "Grief and loss",
  teens: "Teenagers",
  children: "Children",
  couples: "Couples",
  addiction: "Addiction",
  adhd: "ADHD",
};

// Languages are stored as lower-case English names, such as "spanish".
const languageLabel = (l: string) => l.charAt(0).toUpperCase() + l.slice(1);

export type FitValues = {
  specialty?: string;
  language?: string;
  telehealth?: "yes";
};

type Params = Record<string, string | string[] | undefined>;

// Read the filters from the URL, dropping values that aren't on the fixed lists.
export function fitFromParams(params: Params): FitValues {
  const specialty = first(params.specialty);
  return {
    specialty:
      specialty && Object.hasOwn(SPECIALTIES, specialty)
        ? specialty
        : undefined,
    language: first(params.language)?.toLowerCase(),
    telehealth: first(params.telehealth) === "yes" ? "yes" : undefined,
  };
}

// Add the filters that are set to a query string.
export function withFit(q: URLSearchParams, fit: FitValues) {
  for (const [k, v] of Object.entries(fit)) if (v) q.set(k, v);
  return q;
}

// Plain controls inside the search form, so filters live in the URL and work without JavaScript.
export function FitFilters({
  values,
  languages,
}: {
  values: FitValues;
  languages: string[];
}) {
  // Keep a language from the URL selectable even if no listing here has it.
  const langs = [...new Set([...languages, values.language ?? ""])].filter(
    Boolean,
  );
  return (
    <fieldset className="search filters">
      <legend>Narrow the list</legend>
      <Select
        id="specialty"
        label="What do you need help with?"
        value={values.specialty ?? ""}
        options={[
          { value: "", label: "Anything" },
          ...Object.entries(SPECIALTIES).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />
      <Select
        id="language"
        label="Language"
        value={values.language ?? ""}
        options={[
          // Every listing offers English; stored languages are only the extra ones.
          { value: "", label: "English" },
          ...langs.map((l) => ({ value: l, label: languageLabel(l) })),
        ]}
      />
      <label className="check">
        <input
          type="checkbox"
          name="telehealth"
          value="yes"
          defaultChecked={values.telehealth === "yes"}
        />
        Video or phone sessions
      </label>
      <button className="btn" type="submit">
        Show therapists
      </button>
    </fieldset>
  );
}
