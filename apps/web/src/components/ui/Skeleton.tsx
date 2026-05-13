interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ className = '', rounded = false }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--sb-bg-muted)] animate-pulse ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-[var(--sb-radius-card)] p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
