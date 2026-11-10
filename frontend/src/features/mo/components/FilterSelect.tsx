interface Option { value: string; label: string }
interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}

export default function FilterSelect({ label, value, options, onChange }: Props) {
  return (
    <label className="select">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="all">{label}: Tất cả</option>
        {options.map((o) => <option key={o.value} value={o.value}>{label}: {o.label}</option>)}
      </select>
    </label>
  );
}
