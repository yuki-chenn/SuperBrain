export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--sb-bg-muted)] rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
