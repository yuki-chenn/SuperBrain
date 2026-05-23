import { usePreciseCharacterStore } from './usePreciseCharacterStore';

export default function RadicalPool() {
  const { radicalPool, disabledRadicalKeys, selectRadical, status } = usePreciseCharacterStore();

  const isPlayable = status === 'playing';
  const disabledSet = new Set(disabledRadicalKeys);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">部首池</div>
      <div className="grid grid-cols-3 gap-2">
        {radicalPool.map((r) => {
          const isDisabled = disabledSet.has(r.key);

          let btnClass = 'flex flex-col items-center justify-center py-3 px-2 rounded-xl border text-lg font-bold transition-all duration-150 select-none ';

          if (isDisabled) {
            btnClass += 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed dark:bg-gray-900 dark:border-gray-800 dark:text-gray-700 ';
          } else if (isPlayable) {
            btnClass += 'bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50 active:scale-95 cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 ';
          } else {
            btnClass += 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-600 ';
          }

          return (
            <button
              key={r.key}
              className={btnClass}
              disabled={isDisabled || !isPlayable}
              onClick={() => selectRadical(r.key)}
              title={isDisabled ? `${r.glyph} 本回合禁用` : r.glyph}
            >
              <span className="text-2xl">{r.glyph}</span>
              {isDisabled && (
                <span className="text-[10px] text-gray-400 mt-0.5">禁用</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
