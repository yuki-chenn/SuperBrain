import { getBlankIndex } from '@brain-games/game-engine';
import { useSlidingPuzzleStore } from './useSlidingPuzzleStore';

interface SlidingPuzzleBoardProps {
  locked?: boolean;
}

export function SlidingPuzzleBoard({ locked: externalLocked }: SlidingPuzzleBoardProps) {
  const board = useSlidingPuzzleStore((s) => s.board);
  const size = useSlidingPuzzleStore((s) => s.size);
  const status = useSlidingPuzzleStore((s) => s.status);
  const moveTileAction = useSlidingPuzzleStore((s) => s.moveTileAction);

  if (board.length === 0) return null;

  const blankIndex = getBlankIndex(board);
  const blankRow = Math.floor(blankIndex / size);
  const blankCol = blankIndex % size;
  const isLocked = externalLocked ?? status !== 'playing';

  const isMovable = (index: number) => {
    if (index === blankIndex) return false;
    const row = Math.floor(index / size);
    const col = index % size;
    return row === blankRow || col === blankCol;
  };

  const handleClick = (tile: number) => {
    if (isLocked || tile === 0) return;
    moveTileAction(tile);
  };

  const gap = size <= 3 ? 3 : size <= 4 ? 2.5 : 2;
  const boardWidth = size <= 3 ? 360 : size <= 4 ? 400 : 440;

  return (
    <div
      className="rounded-[28px] bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] p-3"
      style={{ width: `min(${boardWidth}px, calc(100vw - 32px))`, aspectRatio: '1 / 1' }}
    >
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {board.map((tile, index) => {
          const isBlank = tile === 0;
          const movable = !isBlank && isMovable(index);

          return (
            <button
              key={index}
              onClick={() => handleClick(tile)}
              disabled={isBlank || isLocked || !movable}
              className={`
                rounded-[var(--sb-radius-tile)] flex items-center justify-center font-bold
                transition-all duration-150 ease-out border
                ${isBlank
                  ? 'bg-transparent border-transparent'
                  : movable && !isLocked
                    ? 'bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] shadow-[0_8px_18px_rgba(16,19,32,0.08)] hover:border-[var(--sb-primary)] hover:-translate-y-[1px] cursor-pointer'
                    : 'bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] shadow-[0_8px_18px_rgba(16,19,32,0.08)] cursor-default'
                }
                ${size <= 3 ? 'text-3xl' : size <= 4 ? 'text-2xl' : 'text-xl'}
                disabled:opacity-60
                text-[var(--sb-text-primary)]
                font-variant-numeric: tabular-nums
              `}
            >
              {isBlank ? '' : tile}
            </button>
          );
        })}
      </div>
    </div>
  );
}
