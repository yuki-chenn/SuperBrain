import { formatDuration } from '../../lib/format';

interface GameResultModalProps {
  metrics: {
    durationMs?: number;
    moves?: number;
    size?: number;
  };
  personalBest?: boolean;
  onRestart?: () => void;
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">挑战成功</h2>
          {personalBest && (
            <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded-full text-sm font-medium">
              个人最佳
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {metrics.durationMs != null && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(metrics.durationMs)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">用时</div>
            </div>
          )}
          {metrics.moves != null && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.moves}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">步数</div>
            </div>
          )}
          {metrics.size != null && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.size}x{metrics.size}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">难度</div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            关闭
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onViewLeaderboard}
          >
            排行榜
          </button>
          {onRestart && (
            <button
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              onClick={onRestart}
            >
              再来一局
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
