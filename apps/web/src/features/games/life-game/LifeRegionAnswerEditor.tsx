import { useRef, useCallback } from 'react';
import type { LocalCellCoord } from '@brain-games/game-engine';
import { LIFE_REGION_WIDTH, LIFE_BOARD_HEIGHT } from '@brain-games/game-engine';

interface LifeRegionAnswerEditorProps {
  regionId: number;
  cells: LocalCellCoord[];
  answerCells?: LocalCellCoord[];
  isLocked: boolean;
  onToggle: (x: number, y: number) => void;
}

const CELL_SIZE = 18;
const PITCH = CELL_SIZE + 1;

export function LifeRegionAnswerEditor({
  regionId,
  cells,
  answerCells,
  isLocked,
  onToggle,
}: LifeRegionAnswerEditorProps) {
  const cellSet = new Set(cells.map((c) => `${c.x},${c.y}`));
  const answerSet = answerCells ? new Set(answerCells.map((c) => `${c.x},${c.y}`)) : null;
  const gridRef = useRef<HTMLDivElement>(null);
  const painting = useRef(false);
  const paintMode = useRef<'add' | 'remove'>('add');
  const lastCell = useRef<string>('');

  const cellFromPointer = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / PITCH);
      const y = Math.floor((clientY - rect.top) / PITCH);
      if (x < 0 || x >= LIFE_REGION_WIDTH || y < 0 || y >= LIFE_BOARD_HEIGHT) return null;
      return [x, y];
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked) return;
      const cell = cellFromPointer(e.clientX, e.clientY);
      if (!cell) return;
      const [x, y] = cell;
      const key = `${x},${y}`;

      painting.current = true;
      lastCell.current = key;
      paintMode.current = cellSet.has(key) ? 'remove' : 'add';
      onToggle(x, y);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isLocked, cellSet, onToggle, cellFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!painting.current || isLocked) return;
      const cell = cellFromPointer(e.clientX, e.clientY);
      if (!cell) return;
      const [x, y] = cell;
      const key = `${x},${y}`;
      if (key === lastCell.current) return;
      lastCell.current = key;

      const isAlive = cellSet.has(key);
      if (paintMode.current === 'add' && !isAlive) onToggle(x, y);
      else if (paintMode.current === 'remove' && isAlive) onToggle(x, y);
    },
    [isLocked, cellSet, onToggle, cellFromPointer],
  );

  const handlePointerUp = useCallback(() => {
    painting.current = false;
    lastCell.current = '';
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--sb-text-muted)]">
          区域 {regionId} · {cells.length} 个存活细胞
        </span>
        {isLocked && (
          <span className="text-xs text-green-400 font-semibold">✓ 正确</span>
        )}
      </div>
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${LIFE_REGION_WIDTH}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${LIFE_BOARD_HEIGHT}, ${CELL_SIZE}px)`,
          gap: '1px',
          touchAction: 'none',
          userSelect: 'none',
          cursor: isLocked ? 'not-allowed' : 'crosshair',
          opacity: isLocked ? 0.7 : 1,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {Array.from({ length: LIFE_BOARD_HEIGHT }, (_, y) =>
          Array.from({ length: LIFE_REGION_WIDTH }, (_, x) => {
            const key = `${x},${y}`;
            const isActive = cellSet.has(key);
            const isAnswer = answerSet?.has(key);
            return (
              <div
                key={key}
                style={{
                  backgroundColor: isActive
                    ? '#facc15'
                    : isAnswer
                      ? 'rgba(56,189,248,0.5)'
                      : 'rgba(55,65,81,0.7)',
                  borderRadius: '2px',
                  pointerEvents: 'none',
                  boxShadow: isAnswer && !isActive ? '0 0 4px rgba(56,189,248,0.4)' : undefined,
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
