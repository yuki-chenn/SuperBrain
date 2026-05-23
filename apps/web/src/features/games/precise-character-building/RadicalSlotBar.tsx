import { usePreciseCharacterStore } from './usePreciseCharacterStore';

export default function RadicalSlotBar() {
  const { selectedRadicalKeys, radicalPool, config, clearRadicalSlot, status } = usePreciseCharacterStore();

  const picksPerRound = config?.picksPerRound || 4;
  const isPlayable = status === 'playing';

  const radicalMap = new Map(radicalPool.map((r) => [r.key, r.glyph]));

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
        部首选择 ({selectedRadicalKeys.length}/{picksPerRound})
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: picksPerRound }, (_, i) => {
          const key = selectedRadicalKeys[i];
          const glyph = key ? radicalMap.get(key) : null;

          return (
            <div
              key={i}
              className={
                'relative flex items-center justify-center aspect-square rounded-xl border-2 border-dashed text-xl font-bold transition-all ' +
                (glyph
                  ? 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-gray-300 bg-gray-50 text-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-700')
              }
            >
              {glyph || '?'}
              {glyph && isPlayable && (
                <button
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                  onClick={() => clearRadicalSlot(i)}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
