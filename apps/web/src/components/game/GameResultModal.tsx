import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDuration } from '../../lib/format';

interface GameResultModalProps {
  metrics: {
    durationMs?: number;
    moves?: number;
    size?: number;
  };
  personalBest?: boolean;
  onRestart: () => void;
  onViewLeaderboard: () => void;
  onClose: () => void;
}

export function GameResultModal({
  metrics,
  personalBest,
  onRestart,
  onViewLeaderboard,
  onClose,
}: GameResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--sb-bg-elevated)] rounded-[var(--sb-radius-modal)] p-8 max-w-sm w-full mx-4 shadow-2xl border border-[var(--sb-border)]">
        <h2 className="text-xl font-bold text-[var(--sb-text-primary)] mb-2">挑战完成</h2>
        {personalBest && (
          <Badge variant="success" className="mb-4">
            新个人最佳记录
          </Badge>
        )}

        <div className="space-y-3 my-6">
          {metrics.durationMs != null && (
            <div className="flex justify-between">
              <span className="text-[var(--sb-text-muted)]">用时</span>
              <span className="font-mono font-bold text-[var(--sb-text-primary)]">
                {formatDuration(metrics.durationMs)}
              </span>
            </div>
          )}
          {metrics.moves != null && (
            <div className="flex justify-between">
              <span className="text-[var(--sb-text-muted)]">步数</span>
              <span className="font-mono font-bold text-[var(--sb-text-primary)]">
                {metrics.moves}
              </span>
            </div>
          )}
          {metrics.size != null && (
            <div className="flex justify-between">
              <span className="text-[var(--sb-text-muted)]">难度</span>
              <span className="font-medium text-[var(--sb-text-primary)]">
                {metrics.size}x{metrics.size}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="md" onClick={onRestart} className="flex-1">
            再来一局
          </Button>
          <Button variant="primary" size="md" onClick={onViewLeaderboard} className="flex-1">
            查看排行榜
          </Button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-secondary)] bg-transparent border-none cursor-pointer"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
