import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { stepLife, DEFAULT_LIFE_BOUNDARY_RULE } from '@brain-games/game-engine';
import type { LifeBoardState } from '@brain-games/game-engine';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

const GRID_W = 30;
const GRID_H = 15;
const CELL_SIZE = 22;
const PITCH = CELL_SIZE + 1;

export default function LifePracticeRoom() {
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);

  const [aliveCells, setAliveCells] = useState<Set<string>>(new Set());
  const [isSimulating, setIsSimulating] = useState(false);
  const [history, setHistory] = useState<LifeBoardState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  // Drag paint
  const painting = useRef(false);
  const paintMode = useRef<'add' | 'remove'>('add');
  const lastCell = useRef<string>('');

  const applyPaint = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;
      if (key === lastCell.current) return;
      lastCell.current = key;

      setAliveCells((prev) => {
        const isAlive = prev.has(key);
        if (paintMode.current === 'add' && !isAlive) {
          const next = new Set(prev);
          next.add(key);
          return next;
        }
        if (paintMode.current === 'remove' && isAlive) {
          const next = new Set(prev);
          next.delete(key);
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const cellFromPointer = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / PITCH);
      const y = Math.floor((clientY - rect.top) / PITCH);
      if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
      return [x, y];
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSimulating) return;
      const cell = cellFromPointer(e.clientX, e.clientY);
      if (!cell) return;
      const [x, y] = cell;
      const key = `${x},${y}`;

      painting.current = true;
      lastCell.current = key;
      paintMode.current = aliveCells.has(key) ? 'remove' : 'add';

      setAliveCells((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });

      // Capture pointer so we get events even outside the grid
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isSimulating, aliveCells, cellFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!painting.current || isSimulating) return;
      const cell = cellFromPointer(e.clientX, e.clientY);
      if (cell) applyPaint(cell[0], cell[1]);
    },
    [isSimulating, cellFromPointer, applyPaint],
  );

  const handlePointerUp = useCallback(() => {
    painting.current = false;
    lastCell.current = '';
  }, []);

  const toBoardState = useCallback(
    (cells: Set<string>): LifeBoardState => {
      const alive: Array<{ x: number; y: number }> = [];
      for (const key of cells) {
        const [x, y] = key.split(',').map(Number);
        alive.push({ x, y });
      }
      return { width: GRID_W, height: GRID_H, aliveCells: alive };
    },
    [],
  );

  const handleStartSim = useCallback(() => {
    setHistory([toBoardState(aliveCells)]);
    setStepIndex(0);
    setIsSimulating(true);
  }, [aliveCells, toBoardState]);

  const handleNext = useCallback(() => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, stepLife(last, DEFAULT_LIFE_BOUNDARY_RULE)];
    });
    setStepIndex((i) => i + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleReset = useCallback(() => {
    setIsSimulating(false);
    setHistory([]);
    setStepIndex(0);
    setAliveCells(new Set());
  }, []);

  const handleBackToDraw = useCallback(() => {
    setIsSimulating(false);
    setHistory([]);
    setStepIndex(0);
  }, []);

  const currentState = isSimulating ? history[stepIndex] : null;
  const displaySet = useMemo(() => {
    if (currentState) {
      const set = new Set<string>();
      for (const c of currentState.aliveCells) set.add(`${c.x},${c.y}`);
      return set;
    }
    return aliveCells;
  }, [currentState, aliveCells]);

  const boardWidth = GRID_W * PITCH;
  const boardHeight = GRID_H * PITCH;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--sb-text-primary)]">备战间</h1>
          <p className="text-xs text-[var(--sb-text-muted)]">
            绘制初始细胞，观察 B3/S23 生命游戏演变
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/games/$slug', params: { slug: 'life-game' } })}
        >
          返回详情
        </Button>
      </div>

      <Card className="mb-4">
        <div
          ref={gridRef}
          style={{
            width: `${boardWidth}px`,
            height: `${boardHeight}px`,
            position: 'relative',
            margin: '0 auto',
            backgroundColor: '#1a1d27',
            borderRadius: '8px',
            border: '1px solid var(--sb-border)',
            cursor: isSimulating ? 'default' : 'crosshair',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {Array.from({ length: GRID_H }, (_, y) =>
            Array.from({ length: GRID_W }, (_, x) => {
              const isAlive = displaySet.has(`${x},${y}`);
              return (
                <div
                  key={`${x},${y}`}
                  style={{
                    position: 'absolute',
                    left: `${x * PITCH}px`,
                    top: `${y * PITCH}px`,
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                    backgroundColor: isAlive ? '#facc15' : 'rgba(55,65,81,0.7)',
                    borderRadius: '2px',
                    boxShadow: isAlive ? '0 0 3px rgba(250,204,21,0.25)' : undefined,
                    pointerEvents: 'none',
                  }}
                />
              );
            }),
          )}
        </div>
      </Card>

      <Card>
        {!isSimulating ? (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleStartSim}
              disabled={aliveCells.size === 0}
            >
              开始推演
            </Button>
            <Button variant="ghost" size="md" onClick={handleReset}>
              清空
            </Button>
            <span className="text-xs text-[var(--sb-text-muted)] ml-auto">
              {aliveCells.size} 个存活细胞
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={handlePrev}
                disabled={stepIndex === 0}
              >
                ← 上一步
              </Button>
              <div className="text-center flex-1">
                <span className="text-sm font-mono font-bold text-[var(--sb-text-primary)]">
                  第 {stepIndex} 代
                </span>
                <span className="text-xs text-[var(--sb-text-muted)] ml-2">
                  {currentState?.aliveCells.length || 0} 个存活
                </span>
              </div>
              <Button variant="primary" size="md" onClick={handleNext}>
                下一步 →
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBackToDraw}>
                返回绘制
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                清空重来
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
