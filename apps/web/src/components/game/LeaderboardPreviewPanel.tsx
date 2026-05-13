import { Link } from '@tanstack/react-router';
import { Card } from '../ui/Card';
import { formatDuration } from '../../lib/format';

interface DisplayColumn {
  metric: string;
  label: string;
  format?: 'duration';
}

interface Entry {
  rank: number;
  user: { id: string; username: string };
  metrics: Record<string, unknown>;
}

interface LeaderboardPreviewPanelProps {
  gameSlug: string;
  title?: string;
  tab?: string;
  difficulty?: string;
  entries: Entry[];
  rankMetric: string;
  displayColumns?: DisplayColumn[];
  className?: string;
}

function formatMetric(value: unknown, format?: string): string {
  if (value === undefined || value === null) return '-';
  if (format === 'duration') return formatDuration(value as number);
  return String(value);
}

export function LeaderboardPreviewPanel({
  gameSlug,
  title = '排行榜',
  tab,
  difficulty,
  entries,
  rankMetric,
  displayColumns,
  className = '',
}: LeaderboardPreviewPanelProps) {
  const primaryCol = displayColumns?.[0] ?? { metric: rankMetric, format: rankMetric === 'durationMs' ? 'duration' as const : undefined };

  return (
    <Card className={`${className}`}>
      <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-4">{title}</h3>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--sb-text-muted)] py-4 text-center">暂无记录</p>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.user.id}
              className="flex items-center gap-3 py-2 border-b border-[var(--sb-border)] last:border-0"
            >
              <span className="text-sm font-mono text-[var(--sb-text-muted)] w-6">#{entry.rank}</span>
              <span className="text-sm text-[var(--sb-text-primary)] flex-1 truncate">
                {entry.user.username}
              </span>
              <span className="text-sm font-mono text-[var(--sb-text-secondary)]">
                {formatMetric(entry.metrics[primaryCol.metric], primaryCol.format)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/games/$slug/leaderboards"
        params={{ slug: gameSlug }}
        search={(tab || difficulty) ? { ...(tab && { tab }), ...(difficulty && { difficulty }) } : undefined}
        className="block mt-4 text-sm text-[var(--sb-primary)] no-underline hover:underline text-center"
      >
        查看完整排行榜
      </Link>
    </Card>
  );
}
