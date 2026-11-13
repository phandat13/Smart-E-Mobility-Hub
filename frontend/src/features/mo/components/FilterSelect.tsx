interface Option {
  value: string;
  label: string;
}
interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}

export default function FilterSelect({ label, value, options, onChange }: Props) {
  return (
    <label className="hub-filter">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="all">{label}: Tất cả</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {label}: {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
