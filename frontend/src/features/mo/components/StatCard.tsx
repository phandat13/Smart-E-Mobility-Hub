import type { Tone } from '../types';

const toneClass = (t?: Tone | 'default') => `tone-${t && t !== 'muted' ? t : 'default'}`;

interface Props {
  label: string;
  value: string;
  valueTone?: Tone | 'default';
  hint: string;
  hintTone?: Tone | 'default';
}

export default function StatCard({ label, value, valueTone = 'default', hint, hintTone = 'default' }: Props) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value ${toneClass(valueTone)}`}>{value}</div>
      <div className={`stat__hint ${toneClass(hintTone)}`}>{hint}</div>
    </div>
  );
}
