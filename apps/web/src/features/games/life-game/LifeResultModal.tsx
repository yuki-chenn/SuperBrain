import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { formatDuration } from '../../../lib/format';

interface LifeResultModalProps {
  durationMs: number;
  errorCount: number;
  targetRegionCount: number;
  personalBest: boolean;
  onRestart: () => void;
  onViewLeaderboard: () => void;
  onClose: () => void;
}

export function LifeResultModal({
  durationMs,
  errorCount,
  targetRegionCount,
  personalBest,
  onRestart,
  onViewLeaderboard,
  onClose,
}: LifeResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[var(--sb-text-primary)] mb-1">
            挑战完成
          </h2>
          {personalBest && (
            <span className="inline-block px-3 py-1 bg-[var(--sb-primary)]/20 text-[var(--sb-primary)] text-xs font-semibold rounded-full">
              新个人最佳
            </span>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-[var(--sb-text-muted)]">用时</span>
            <span className="text-sm font-mono font-bold text-[var(--sb-text-primary)]">
              {formatDuration(durationMs)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[var(--sb-text-muted)]">错误次数</span>
            <span className="text-sm font-mono font-bold text-[var(--sb-text-primary)]">
              {errorCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[var(--sb-text-muted)]">完成区域</span>
            <span className="text-sm font-mono font-bold text-[var(--sb-text-primary)]">
              {targetRegionCount} / {targetRegionCount}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="md" onClick={onRestart} className="flex-1">
            再玩一次
          </Button>
          <Button variant="primary" size="md" onClick={onViewLeaderboard} className="flex-1">
            查看排行榜
          </Button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)]"
        >
          ✕
        </button>
      </Card>
    </div>
  );
}
