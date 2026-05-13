interface MetricPillProps {
  label: string;
  value: string | number;
  className?: string;
}

export function MetricPill({ label, value, className = '' }: MetricPillProps) {
  return (
    <div
      className={`flex flex-col items-center px-5 py-3 bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-2xl ${className}`}
    >
      <span className="text-2xl font-bold text-[var(--sb-text-primary)] tabular-nums">
        {value}
      </span>
      <span className="text-xs text-[var(--sb-text-muted)] mt-0.5">{label}</span>
    </div>
  );
}
