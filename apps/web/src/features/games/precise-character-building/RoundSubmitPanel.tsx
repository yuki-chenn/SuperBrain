import { usePreciseCharacterStore } from './usePreciseCharacterStore';

export default function RoundSubmitPanel() {
  const {
    selectedRadicalKeys,
    selectedCellIndices,
    config,
    currentRoundIndex,
    submitRound,
    status,
  } = usePreciseCharacterStore();

  const picksPerRound = config?.picksPerRound || 4;
  const canSubmit =
    status === 'playing' &&
    selectedRadicalKeys.length === picksPerRound &&
    selectedCellIndices.length === picksPerRound;

  const cellLabels = selectedCellIndices.map(
    (idx) => `(${Math.floor(idx / 6)},${idx % 6})`,
  );

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
        第 {currentRoundIndex + 1} 回合
      </div>

      {selectedCellIndices.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span>路径：</span>
          {cellLabels.map((label, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-0.5">→</span>}
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{label}</span>
            </span>
          ))}
        </div>
      )}

      <button
        className={
          'w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ' +
          (canSubmit
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600')
        }
        disabled={!canSubmit}
        onClick={submitRound}
      >
        {status === 'submitting' ? '验证中...' : '提交本回合'}
      </button>
    </div>
  );
}
