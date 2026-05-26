import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  stepLife,
  isSameBoard,
  boardHash,
  LIFE_MAX_GENERATIONS,
} from '@brain-games/game-engine';
import type { LifeBoardState, LifeBoundaryRule } from '@brain-games/game-engine';
import { LifeInitialBoard } from './LifeInitialBoard';

type SimStatus = 'EVOLVING' | 'STABLE' | 'OSCILLATING' | 'MAX_REACHED';

interface LifeSimulationPlayerProps {
  initialState: LifeBoardState;
  boundary: LifeBoundaryRule;
  targetRegionIds: number[];
  correctRegionIds: number[];
  onClose: () => void;
}

const SPEED_OPTIONS = [
  { key: 'slow', label: '慢', intervalMs: 600 },
  { key: 'normal', label: '中', intervalMs: 250 },
  { key: 'fast', label: '快', intervalMs: 80 },
] as const;

/**
 * Admin/debug overlay that replays Conway's Game of Life evolution from the
 * current attempt's `initialState` step by step. Pure client-side: uses the
 * engine's `stepLife` to lazily extend a frame cache, and mirrors the same
 * `simulateUntilStable` termination rules (fixed point / oscillation / max
 * generation) for status reporting.
 *
 * The cell rendering is delegated to `LifeInitialBoard` — we just swap in the
 * current generation's `aliveCells` so the visual is identical to the puzzle
 * board the player is looking at.
 */
export function LifeSimulationPlayer({
  initialState,
  boundary,
  targetRegionIds,
  correctRegionIds,
  onClose,
}: LifeSimulationPlayerProps) {
  // Lazy-extending frame cache. frames[0] === initialState.
  const framesRef = useRef<LifeBoardState[]>([initialState]);
  // Map of boardHash → first generation it appeared at, used for oscillation
  // detection mirroring `simulateUntilStable`.
  const seenHashesRef = useRef<Map<string, number>>(
    new Map([[boardHash(initialState), 0]]),
  );
  const [genIndex, setGenIndex] = useState(0);
  const [maxKnownGen, setMaxKnownGen] = useState(0);
  const [status, setStatus] = useState<SimStatus>('EVOLVING');
  const [stableAt, setStableAt] = useState<number | null>(null);
  const [oscPeriod, setOscPeriod] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedKey, setSpeedKey] = useState<typeof SPEED_OPTIONS[number]['key']>('normal');

  // Reset everything if the initial board changes (e.g. user starts a new attempt
  // while the player is still mounted — should never happen because we unmount,
  // but guard anyway).
  useEffect(() => {
    framesRef.current = [initialState];
    seenHashesRef.current = new Map([[boardHash(initialState), 0]]);
    setGenIndex(0);
    setMaxKnownGen(0);
    setStatus('EVOLVING');
    setStableAt(null);
    setOscPeriod(null);
    setIsPlaying(false);
  }, [initialState]);

  /**
   * Compute the next generation if not already cached, classify the run
   * (STABLE / OSCILLATING / MAX_REACHED / EVOLVING), and append to cache.
   * Returns the resulting generation index, or null if the frontier cannot
   * advance (terminal state already reached).
   */
  const advanceFrontier = useCallback((): number | null => {
    const frames = framesRef.current;
    const seen = seenHashesRef.current;
    const lastIdx = frames.length - 1;
    if (lastIdx >= LIFE_MAX_GENERATIONS) return null;

    const current = frames[lastIdx];
    const next = stepLife(current, boundary);

    if (isSameBoard(next, current)) {
      setStatus('STABLE');
      setStableAt(lastIdx + 1);
      frames.push(next);
      const newMax = lastIdx + 1;
      setMaxKnownGen(newMax);
      return newMax;
    }

    const h = boardHash(next);
    const prev = seen.get(h);
    if (prev !== undefined) {
      const period = (lastIdx + 1) - prev;
      setStatus('OSCILLATING');
      setOscPeriod(period);
      frames.push(next);
      const newMax = lastIdx + 1;
      setMaxKnownGen(newMax);
      return newMax;
    }

    seen.set(h, lastIdx + 1);
    frames.push(next);
    const newMax = lastIdx + 1;
    setMaxKnownGen(newMax);
    if (newMax >= LIFE_MAX_GENERATIONS) {
      setStatus('MAX_REACHED');
    }
    return newMax;
  }, [boundary]);

  const isTerminal = status === 'STABLE' || status === 'OSCILLATING' || status === 'MAX_REACHED';

  const goToGen = useCallback(
    (target: number) => {
      const clampedTarget = Math.max(0, target);
      let frontier = framesRef.current.length - 1;
      // Extend cache if needed.
      while (clampedTarget > frontier) {
        if (isTerminal && frontier >= maxKnownGen) break;
        const next = advanceFrontier();
        if (next === null) break;
        frontier = next;
      }
      const finalGen = Math.min(clampedTarget, framesRef.current.length - 1);
      setGenIndex(finalGen);
    },
    [advanceFrontier, isTerminal, maxKnownGen],
  );

  const stepNext = useCallback(() => {
    goToGen(genIndex + 1);
  }, [genIndex, goToGen]);

  const stepPrev = useCallback(() => {
    setGenIndex((g) => Math.max(0, g - 1));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setGenIndex(0);
  }, []);

  const jumpToStable = useCallback(() => {
    setIsPlaying(false);
    // Advance until we hit a terminal status or maxGen.
    while (
      framesRef.current.length - 1 < LIFE_MAX_GENERATIONS &&
      !(status === 'STABLE' || status === 'OSCILLATING' || status === 'MAX_REACHED')
    ) {
      const result = advanceFrontier();
      if (result === null) break;
    }
    // Snap genIndex to the latest known frame (terminal frame).
    setGenIndex(framesRef.current.length - 1);
  }, [advanceFrontier, status]);

  // Auto-play loop.
  useEffect(() => {
    if (!isPlaying) return;
    const speed = SPEED_OPTIONS.find((s) => s.key === speedKey) ?? SPEED_OPTIONS[1];
    const id = window.setInterval(() => {
      // Read latest values from refs/state at tick time.
      setGenIndex((curr) => {
        const cacheLast = framesRef.current.length - 1;
        if (curr < cacheLast) return curr + 1;
        // Need to extend frontier.
        const next = advanceFrontier();
        if (next === null) {
          // Terminal: stop auto-play.
          setIsPlaying(false);
          return curr;
        }
        return next;
      });
    }, speed.intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, speedKey, advanceFrontier]);

  // Derived: aliveCells of the current generation.
  const currentAliveCells = useMemo(() => {
    const frames = framesRef.current;
    const idx = Math.min(genIndex, frames.length - 1);
    return frames[idx]?.aliveCells ?? [];
  }, [genIndex, maxKnownGen]); // include maxKnownGen so memo refreshes when cache grows

  const statusLabel: string = (() => {
    switch (status) {
      case 'STABLE':
        return stableAt !== null ? `稳定 @ 第 ${stableAt} 代` : '稳定';
      case 'OSCILLATING':
        return oscPeriod !== null ? `振荡 (周期 ${oscPeriod})` : '振荡';
      case 'MAX_REACHED':
        return `已达最大代数 ${LIFE_MAX_GENERATIONS}`;
      default:
        return '推演中';
    }
  })();

  return (
    <div className="w-full space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-[var(--sb-text-muted)]">演变过程</span>
          <span className="font-mono tabular-nums text-base font-semibold text-[var(--sb-text-primary)]">
            第 {genIndex} / {maxKnownGen} 代
          </span>
          <span className="text-xs text-[var(--sb-text-muted)]">{statusLabel}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] bg-transparent border-none cursor-pointer"
          aria-label="关闭演变过程"
        >
          关闭 ✕
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]">
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 text-xs rounded border border-[var(--sb-border)] hover:border-[var(--sb-primary)] hover:text-[var(--sb-primary)] transition-colors"
          aria-label="回到第 0 代"
        >
          ⏮ 起点
        </button>
        <button
          type="button"
          onClick={stepPrev}
          disabled={genIndex <= 0}
          className="px-2 py-1 text-xs rounded border border-[var(--sb-border)] hover:border-[var(--sb-primary)] hover:text-[var(--sb-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="上一代"
        >
          ⏪ 上一代
        </button>
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          disabled={isTerminal && genIndex >= maxKnownGen}
          className="px-3 py-1 text-xs font-semibold rounded bg-[var(--sb-primary)] text-white hover:bg-[var(--sb-primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          onClick={stepNext}
          disabled={isTerminal && genIndex >= maxKnownGen}
          className="px-2 py-1 text-xs rounded border border-[var(--sb-border)] hover:border-[var(--sb-primary)] hover:text-[var(--sb-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="下一代"
        >
          下一代 ⏩
        </button>
        <button
          type="button"
          onClick={jumpToStable}
          className="px-2 py-1 text-xs rounded border border-[var(--sb-border)] hover:border-[var(--sb-primary)] hover:text-[var(--sb-primary)] transition-colors"
          aria-label="跳到稳定态"
        >
          ⏭ 稳定态
        </button>

        <div className="ml-2 flex items-center gap-1 text-xs text-[var(--sb-text-muted)]">
          速度
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSpeedKey(opt.key)}
              className={
                'ml-1 px-2 py-0.5 rounded border transition-colors ' +
                (speedKey === opt.key
                  ? 'bg-[var(--sb-primary)] text-white border-[var(--sb-primary)]'
                  : 'border-[var(--sb-border)] hover:border-[var(--sb-primary)]')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={Math.max(maxKnownGen, 1)}
          value={genIndex}
          onChange={(e) => goToGen(parseInt(e.target.value, 10) || 0)}
          className="flex-1 min-w-[120px] ml-2 accent-[var(--sb-primary)]"
          aria-label="代数进度"
        />
      </div>

      {/* Board (reuses puzzle board layout) */}
      <LifeInitialBoard
        aliveCells={currentAliveCells}
        targetRegionIds={targetRegionIds}
        correctRegionIds={correctRegionIds}
      />

      <p className="text-[10px] text-[var(--sb-text-muted)] text-center">
        本视图仅管理员调试用。用 Conway 生命游戏 B3/S23 规则在客户端推演,
        与服务端 simulation 完全一致。
      </p>
    </div>
  );
}

export default LifeSimulationPlayer;
