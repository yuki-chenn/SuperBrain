import { Button } from '../ui/Button';
import { formatChineseDuration } from '../../lib/format';

interface GameTimeoutModalProps {
  /** Render the modal only when true. */
  open: boolean;
  /** The configured time budget that was reached, in ms. */
  maxDurationMs: number;
  onRestart: () => void;
  onBackToGames: () => void;
  /** Optional secondary close (e.g. ESC). Defaults to onBackToGames. */
  onClose?: () => void;
}

/**
 * Failure modal shown when an attempt's `status === 'timeout'`.
 *
 * Distinct from `GameResultModal` (success path) because the timeout case
 * has no metrics to celebrate, no leaderboard CTA, and must surface the
 * "not counted" disclaimer that mirrors the API's actual behavior:
 * `recordAttemptResult` is never called for INVALID attempts, so this row
 * does NOT advance any leaderboard entry.
 *
 * Driven purely by `status === 'timeout'`. Both client-side timer expiry
 * and server-detected timeout converge on the same store status, so this
 * single component covers both paths.
 */
export function GameTimeoutModal({
  open,
  maxDurationMs,
  onRestart,
  onBackToGames,
  onClose,
}: GameTimeoutModalProps) {
  if (!open) return null;

  const handleClose = onClose ?? onBackToGames;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-timeout-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[var(--sb-bg-elevated)] rounded-[var(--sb-radius-modal)] p-8 max-w-sm w-full mx-4 shadow-2xl border border-[var(--sb-danger)]/40">
        {/* Icon + heading */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sb-danger)]/10 text-[var(--sb-danger)]">
            {/* simple inline clock-x icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
              <path d="M16 16l4 4M20 16l-4 4" />
            </svg>
          </div>
          <h2
            id="game-timeout-modal-title"
            className="text-xl font-bold text-[var(--sb-text-primary)]"
          >
            挑战超时
          </h2>
        </div>

        <p className="text-sm text-[var(--sb-text-secondary)] mb-4">
          已达到本难度的最长时长
          {maxDurationMs > 0 ? (
            <>
              （
              <span className="font-mono tabular-nums">
                {formatChineseDuration(maxDurationMs)}
              </span>
              ）
            </>
          ) : null}
          ，本次挑战自动结束。
        </p>

        <div className="rounded-lg border border-[var(--sb-danger)]/30 bg-[var(--sb-danger)]/5 px-3 py-2 mb-6">
          <p className="text-xs text-[var(--sb-danger)]">
            本次挑战因超时未计入排行榜成绩。
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onBackToGames}
            className="flex-1"
          >
            返回游戏中心
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onRestart}
            className="flex-1"
            autoFocus
          >
            再来一局
          </Button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-secondary)] bg-transparent border-none cursor-pointer"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}

export default GameTimeoutModal;
