import { Icon } from "./Icon";

export type Option = { value: string; label: string };

export function Select({
  id,
  label,
  options,
  value,
}: {
  id: string;
  label: string;
  options: Option[];
  value: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="select">
        <select id={id} name={id} defaultValue={value}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </div>
  );
}
