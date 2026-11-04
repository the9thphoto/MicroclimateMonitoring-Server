interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
}

export function KpiCard({ label, value, unit }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">
        {value}
        {unit ? <span className="kpi-card__unit">{unit}</span> : null}
      </span>
    </article>
  );
}
