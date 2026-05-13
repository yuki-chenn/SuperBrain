import type { LeaderboardEntry } from '@brain-games/shared';
import { useAuthStore } from '../auth/auth-store';
import { formatDuration } from '../../lib/format';

interface DisplayColumn {
  metric: string;
  label: string;
  format?: 'duration';
}

interface Props {
  entries: LeaderboardEntry[];
  rankMetric: string;
  displayColumns?: DisplayColumn[];
}

function formatMetric(value: unknown, format?: string): string {
  if (value === undefined || value === null) return '-';
  if (format === 'duration') return formatDuration(value as number);
  return String(value);
}

export function LeaderboardTable({ entries, rankMetric, displayColumns }: Props) {
  const user = useAuthStore((s) => s.user);

  // Fallback: old behavior if no displayColumns provided
  const columns: DisplayColumn[] = displayColumns ?? [
    { metric: rankMetric, label: rankMetric === 'durationMs' ? '用时' : rankMetric, format: rankMetric === 'durationMs' ? 'duration' : undefined },
    { metric: 'moves', label: '步数' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--sb-border)]">
            <th className="text-left p-3 text-xs font-semibold text-[var(--sb-text-muted)] uppercase tracking-wider">排名</th>
            <th className="text-left p-3 text-xs font-semibold text-[var(--sb-text-muted)] uppercase tracking-wider">用户</th>
            {columns.map((col) => (
              <th key={col.metric} className="text-left p-3 text-xs font-semibold text-[var(--sb-text-muted)] uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            <th className="text-left p-3 text-xs font-semibold text-[var(--sb-text-muted)] uppercase tracking-wider">时间</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = user?.id === entry.user.id;
            const metrics = entry.metrics as Record<string, unknown>;
            return (
              <tr
                key={entry.user.id}
                className={`border-b border-[var(--sb-border)] transition-colors ${
                  isCurrentUser ? 'bg-[var(--sb-primary-soft)]' : 'hover:bg-[var(--sb-bg-muted)]'
                }`}
              >
                <td className="p-3 font-mono text-sm text-[var(--sb-text-muted)]">#{entry.rank}</td>
                <td className="p-3">
                  <span className="text-sm text-[var(--sb-text-primary)]">
                    {entry.user.username}
                  </span>
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-[var(--sb-primary)] font-medium">(你)</span>
                  )}
                </td>
                {columns.map((col) => (
                  <td key={col.metric} className="p-3 font-mono text-sm text-[var(--sb-text-primary)]">
                    {formatMetric(metrics[col.metric], col.format)}
                  </td>
                ))}
                <td className="p-3 text-sm text-[var(--sb-text-muted)]">
                  {entry.completedAt ? new Date(entry.completedAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={3 + columns.length} className="p-8 text-center text-sm text-[var(--sb-text-muted)]">
                暂无记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
