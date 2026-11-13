export default function SimulationStatistic({
  label,
  value,
  detail,
  tone = '',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article className="what-if-simulation__stat">
      <span>{label}</span>
      <b className={tone ? 'what-if-simulation__stat-tone--' + tone : ''}>{value}</b>
      <small className={tone ? 'what-if-simulation__stat-tone--' + tone : ''}>{detail}</small>
    </article>
  );
}
