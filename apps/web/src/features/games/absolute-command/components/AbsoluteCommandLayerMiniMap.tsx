import { useMemo } from 'react';
import type { AbsoluteCommandCell, AbsoluteCommandRuntimeState } from '@brain-games/game-engine';
import { coordKey } from '@brain-games/game-engine';

interface MiniMapProps {
  cells: AbsoluteCommandCell[];
  size: { width: number; height: number; depth: number };
  state: AbsoluteCommandRuntimeState;
}

const CELL_SIZE = 18;

function getCellColor(
  key: string,
  cell: AbsoluteCommandCell | undefined,
  visitedSet: Set<string>,
  redSet: Set<string>,
  playerKey: string,
): string {
  if (key === playerKey) return 'bg-green-500';
  if (cell?.type === 'DISABLED') return 'bg-slate-900/30';
  if (cell?.type === 'INITIAL_RED' || redSet.has(key)) return 'bg-red-500';
  if (cell?.type === 'YELLOW_STOP') return 'bg-yellow-400';
  if (visitedSet.has(key)) return 'bg-sky-400/60';
  return 'bg-slate-400/25';
}

export function AbsoluteCommandLayerMiniMap({ cells, size, state }: MiniMapProps) {
  const cellMap = useMemo(() => {
    const map = new Map<string, AbsoluteCommandCell>();
    for (const cell of cells) {
      map.set(coordKey(cell.coord), cell);
    }
    return map;
  }, [cells]);

  const visitedSet = useMemo(() => new Set(state.visitedCells), [state.visitedCells]);
  const redSet = useMemo(() => new Set(state.redCells), [state.redCells]);
  const playerKey = coordKey(state.position);

  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ns of state.numberStates) {
      map.set(coordKey(ns.coord), ns.remainingPasses);
    }
    return map;
  }, [state.numberStates]);

  const layers = [];
  for (let z = 0; z < size.depth; z++) {
    layers.push(
      <div key={z} className="mb-2">
        <div className="text-[10px] text-[var(--sb-text-muted)] mb-1">
          Layer {z + 1}
        </div>
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `repeat(${size.width}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${size.height}, ${CELL_SIZE}px)`,
          }}
        >
          {Array.from({ length: size.height }, (_, y) =>
            Array.from({ length: size.width }, (_, x) => {
              const coord = { x, y, z };
              const key = coordKey(coord);
              const cell = cellMap.get(key);
              const colorClass = getCellColor(key, cell, visitedSet, redSet, playerKey);
              const numRemaining = numberMap.get(key);

              return (
                <div
                  key={key}
                  className={`${colorClass} rounded-sm flex items-center justify-center`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  title={`(${x},${y},${z})`}
                >
                  {cell?.type === 'NUMBER' && numRemaining !== undefined && numRemaining > 0 && (
                    <span className="text-[8px] font-bold text-red-600">
                      {numRemaining}
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>,
    );
  }

  return <div>{layers}</div>;
}
