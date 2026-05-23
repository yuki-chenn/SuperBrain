import { usePreciseCharacterStore } from './usePreciseCharacterStore';

export default function CharacterBoard() {
  const {
    cells,
    litCellIndices,
    selectedCellIndices,
    litResults,
    currentPosition,
    config,
    status,
    selectCell,
  } = usePreciseCharacterStore();

  const litSet = new Set(litCellIndices);
  const selectedSet = new Set(selectedCellIndices);
  const litResultMap = new Map(litResults.map((r) => [r.cellIndex, r.resultChar]));

  const isPlayable = status === 'playing';

  return (
    <div className="grid grid-cols-6 gap-2 w-full max-w-[480px] mx-auto">
      {cells.map((cell) => {
        const isLit = litSet.has(cell.index);
        const selectedIndex = selectedCellIndices.indexOf(cell.index);
        const isSelected = selectedIndex >= 0;
        const isCurrentPos = currentPosition && currentPosition.row === cell.row && currentPosition.col === cell.col;

        let cellClass = 'aspect-square rounded-2xl border flex items-center justify-center text-2xl md:text-3xl font-bold transition-all duration-200 cursor-pointer select-none ';

        if (isLit) {
          cellClass += 'bg-gradient-to-b from-amber-200 to-yellow-400 border-yellow-500 text-amber-900 ';
        } else if (isSelected) {
          cellClass += 'bg-white border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.3)] text-gray-800 dark:bg-gray-800 dark:text-white ';
        } else if (isCurrentPos) {
          cellClass += 'bg-blue-50 border-blue-300 text-gray-700 dark:bg-blue-900/30 dark:text-gray-300 ';
        } else if (isPlayable && !isLit) {
          cellClass += 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 ';
        } else {
          cellClass += 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-600 ';
        }

        return (
          <div
            key={cell.index}
            className={cellClass}
            onClick={() => {
              if (isPlayable && !isLit) selectCell(cell.index);
            }}
          >
            {isLit ? (
              <span>{litResultMap.get(cell.index) || cell.rootGlyph}</span>
            ) : isSelected ? (
              <div className="flex flex-col items-center">
                <span className="text-sm text-blue-500 font-medium">{selectedIndex + 1}</span>
                <span className="text-base">{cell.rootGlyph}</span>
              </div>
            ) : (
              <span>{cell.rootGlyph}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
