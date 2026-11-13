import type { Tone } from '../types';

const toneClass = (t?: Tone | 'default') => `hub-text--${t && t !== 'muted' ? t : 'default'}`;

interface Props {
  label: string;
  value: string;
  valueTone?: Tone | 'default';
  hint: string;
  hintTone?: Tone | 'default';
}

export default function StatCard({
  label,
  value,
  valueTone = 'default',
  hint,
  hintTone = 'default',
}: Props) {
  return (
    <div className="hub-statistic">
      <div className="hub-statistic__label">{label}</div>
      <div className={`hub-statistic__value ${toneClass(valueTone)}`}>{value}</div>
      <div className={`hub-statistic__hint ${toneClass(hintTone)}`}>{hint}</div>
    </div>
  );
}
