import { formatDuration } from '../../../../lib/format';

interface ResultModalProps {
  commandCount: number;
  durationMs: number;
  travelDistance: number;
  personalBest: boolean;
  onClose: () => void;
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
}

export function AbsoluteCommandResultModal({
  commandCount,
  durationMs,
  travelDistance,
  personalBest,
  onClose,
  onViewLeaderboard,
  onPlayAgain,
}: ResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--sb-bg-card)] rounded-2xl p-6 max-w-sm w-full mx-4 border border-[var(--sb-border)]">
        <h2 className="text-xl font-bold text-[var(--sb-text-primary)] mb-1 text-center">
          挑战完成
        </h2>
        <p className="text-xs text-[var(--sb-text-muted)] text-center mb-4">绝对指令</p>

        {personalBest && (
          <div className="bg-[var(--sb-primary-soft)] rounded-lg px-3 py-1.5 text-center mb-4">
            <span className="text-sm font-semibold text-[var(--sb-primary)]">新个人最佳</span>
          </div>
        )}

        <div className="space-y-2 mb-6">
          <ResultRow label="步数" value={String(commandCount)} />
          <ResultRow label="用时" value={formatDuration(durationMs)} />
          <ResultRow label="距离" value={String(travelDistance)} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-[var(--sb-text-secondary)]
              bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)]
              hover:bg-[var(--sb-bg-muted)] transition-colors"
          >
            关闭
          </button>
          <button
            onClick={onViewLeaderboard}
            className="flex-1 py-2.5 rounded-xl text-sm text-white
              bg-[var(--sb-primary)] hover:opacity-90 transition-opacity"
          >
            查看排行榜
          </button>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full mt-2 py-2 text-xs text-[var(--sb-text-muted)]
            hover:text-[var(--sb-primary)] transition-colors"
        >
          再挑战一次
        </button>
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[var(--sb-text-muted)]">{label}</span>
      <span className="text-sm font-mono font-semibold text-[var(--sb-text-primary)] tabular-nums">
        {value}
      </span>
    </div>
  );
}
