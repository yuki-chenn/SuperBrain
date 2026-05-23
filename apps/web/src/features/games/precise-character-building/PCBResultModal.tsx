import { useNavigate } from '@tanstack/react-router';

interface Props {
  result: {
    durationMs: number;
    errorCount: number;
    rounds: number;
    litCells: number;
    personalBest: boolean;
  };
  onClose: () => void;
  onRestart: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PCBResultModal({ result, onClose, onRestart }: Props) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">挑战成功</h2>
          {result.personalBest && (
            <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded-full text-sm font-medium">
              个人最佳
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(result.durationMs)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">用时</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {result.errorCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">错误次数</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {result.rounds}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">回合数</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {result.litCells}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">点亮格子</div>
          </div>
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
            onClick={() =>
              navigate({
                to: '/games/$slug/leaderboards',
                params: { slug: 'precise-character-building' },
              })
            }
          >
            排行榜
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            onClick={onRestart}
          >
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
}
