import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import {
  getRegionById,
  getLifeRegions,
  LIFE_BOARD_WIDTH,
  LIFE_BOARD_HEIGHT,
  LIFE_REGION_WIDTH,
} from '@brain-games/game-engine';

interface LifeInitialBoardProps {
  aliveCells: Array<{ x: number; y: number }>;
  targetRegionIds: number[];
  correctRegionIds: number[];
}

const CELL_SIZE = 18;
const PITCH = CELL_SIZE + 1;
const HEADER_HEIGHT = 28;
const VIEWPORT_COLS = 30;
const VIEWPORT_WIDTH = VIEWPORT_COLS * PITCH;

// Momentum tuning
const FRICTION = 0.85; // per-frame velocity multiplier (lower = faster stop)
const MIN_VELOCITY = 0.5; // stop threshold px/frame
const VELOCITY_SAMPLE_MS = 50; // window to average pointer speed

export function LifeInitialBoard({
  aliveCells,
  targetRegionIds,
  correctRegionIds,
}: LifeInitialBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const allRegions = useMemo(() => getLifeRegions(), []);

  const [headerOffset, setHeaderOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const boardWidth = LIFE_BOARD_WIDTH * PITCH;
  const boardHeight = LIFE_BOARD_HEIGHT * PITCH;
  const tripleWidth = boardWidth * 3;

  // Internal scroll position (we manage it ourselves, not via native scrollLeft)
  const scrollPos = useRef(0);
  const velocity = useRef(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);
  const animFrame = useRef(0);

  // Velocity sampling
  const lastPointerX = useRef(0);
  const lastPointerTime = useRef(0);

  const aliveSet = useMemo(() => {
    const set = new Set<string>();
    for (const cell of aliveCells) set.add(`${cell.x},${cell.y}`);
    return set;
  }, [aliveCells]);

  const targetRegionSet = useMemo(() => new Set(targetRegionIds), [targetRegionIds]);
  const correctRegionSet = useMemo(() => new Set(correctRegionIds), [correctRegionIds]);

  // Apply scroll position to DOM
  const applyScroll = useCallback(
    (pos: number) => {
      const el = containerRef.current;
      if (!el) return;
      // Normalize into [0, boardWidth)
      let p = pos % boardWidth;
      if (p < 0) p += boardWidth;
      el.scrollLeft = boardWidth + p; // center copy offset
      setHeaderOffset(-(boardWidth + p));
    },
    [boardWidth],
  );

  // Initialize to first target region
  useEffect(() => {
    if (containerRef.current) {
      let offset = 0;
      if (targetRegionIds.length > 0) {
        const firstTarget = getRegionById(targetRegionIds[0]);
        offset = firstTarget.xStart * PITCH - 40;
      }
      scrollPos.current = offset;
      applyScroll(offset);
    }
  }, [targetRegionIds, applyScroll]);

  // Momentum animation loop
  const animate = useCallback(() => {
    velocity.current *= FRICTION;
    if (Math.abs(velocity.current) < MIN_VELOCITY) {
      velocity.current = 0;
      return;
    }
    scrollPos.current += velocity.current;
    applyScroll(scrollPos.current);
    animFrame.current = requestAnimationFrame(animate);
  }, [applyScroll]);

  const startMomentum = useCallback(() => {
    cancelAnimationFrame(animFrame.current);
    if (Math.abs(velocity.current) > MIN_VELOCITY) {
      animFrame.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const stopMomentum = useCallback(() => {
    cancelAnimationFrame(animFrame.current);
    velocity.current = 0;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animFrame.current);
  }, []);

  // --- Mouse ---
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      stopMomentum();
      isDragging.current = true;
      setDragging(true);
      dragStartX.current = e.clientX;
      dragStartPos.current = scrollPos.current;
      lastPointerX.current = e.clientX;
      lastPointerTime.current = performance.now();
      velocity.current = 0;
    },
    [stopMomentum],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const now = performance.now();
      const dx = dragStartX.current - e.clientX;
      scrollPos.current = dragStartPos.current + dx;
      applyScroll(scrollPos.current);

      // Sample velocity
      const dt = now - lastPointerTime.current;
      if (dt > 0) {
        const instantV = (lastPointerX.current - e.clientX) / (dt / 16.67); // px per frame
        velocity.current = velocity.current * 0.7 + instantV * 0.3; // smooth
      }
      lastPointerX.current = e.clientX;
      lastPointerTime.current = now;
    },
    [applyScroll],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    startMomentum();
  }, [startMomentum]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    startMomentum();
  }, [startMomentum]);

  // --- Touch ---
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      stopMomentum();
      isDragging.current = true;
      setDragging(true);
      dragStartX.current = e.touches[0].clientX;
      dragStartPos.current = scrollPos.current;
      lastPointerX.current = e.touches[0].clientX;
      lastPointerTime.current = performance.now();
      velocity.current = 0;
    },
    [stopMomentum],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      const now = performance.now();
      const clientX = e.touches[0].clientX;
      const dx = dragStartX.current - clientX;
      scrollPos.current = dragStartPos.current + dx;
      applyScroll(scrollPos.current);

      const dt = now - lastPointerTime.current;
      if (dt > 0) {
        const instantV = (lastPointerX.current - clientX) / (dt / 16.67);
        velocity.current = velocity.current * 0.7 + instantV * 0.3;
      }
      lastPointerX.current = clientX;
      lastPointerTime.current = now;
    },
    [applyScroll],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    startMomentum();
  }, [startMomentum]);

  // --- Render helpers ---
  const renderBoardCopy = (offsetX: number, prefix: string) => (
    <div
      style={{
        position: 'absolute',
        left: `${offsetX}px`,
        top: 0,
        width: `${boardWidth}px`,
        height: `${boardHeight}px`,
      }}
    >
      {allRegions.map((region) => {
        if (region.xStart === 0) return null;
        return (
          <div
            key={`b-${prefix}-${region.id}`}
            style={{
              position: 'absolute',
              left: `${region.xStart * PITCH - 1}px`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: 'rgba(99,102,241,0.6)',
              boxShadow: '0 0 6px 1px rgba(99,102,241,0.3)',
            }}
          />
        );
      })}
      {Array.from({ length: LIFE_BOARD_HEIGHT }, (_, y) =>
        Array.from({ length: LIFE_BOARD_WIDTH }, (_, x) => {
          const isAlive = aliveSet.has(`${x},${y}`);
          return (
            <div
              key={`${prefix}-${x},${y}`}
              style={{
                position: 'absolute',
                left: `${x * PITCH}px`,
                top: `${y * PITCH}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                backgroundColor: isAlive ? '#facc15' : 'rgba(55,65,81,0.7)',
                borderRadius: '2px',
                boxShadow: isAlive ? '0 0 3px rgba(250,204,21,0.25)' : undefined,
              }}
            />
          );
        }),
      )}
    </div>
  );

  const renderHeaderCopy = (offsetX: number, prefix: string) => (
    <div
      style={{
        position: 'absolute',
        left: `${offsetX}px`,
        top: 0,
        width: `${boardWidth}px`,
        height: `${HEADER_HEIGHT}px`,
      }}
    >
      {allRegions.map((region) => {
        const isTarget = targetRegionSet.has(region.id);
        const isCorrect = correctRegionSet.has(region.id);
        return (
          <div
            key={`${prefix}-h-${region.id}`}
            style={{
              position: 'absolute',
              left: `${region.xStart * PITCH}px`,
              width: `${LIFE_REGION_WIDTH * PITCH}px`,
              height: `${HEADER_HEIGHT}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
              userSelect: 'none',
              borderRight: '1px solid var(--sb-border)',
              color: isCorrect
                ? '#4ade80'
                : isTarget
                  ? 'var(--sb-primary)'
                  : 'var(--sb-text-secondary)',
              backgroundColor: isTarget
                ? 'rgba(99,102,241,0.12)'
                : 'var(--sb-bg-muted)',
            }}
          >
            区域 {region.id}
            {isCorrect && ' ✓'}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full select-none">
      {/* Header */}
      <div
        style={{
          width: `${VIEWPORT_WIDTH}px`,
          height: `${HEADER_HEIGHT}px`,
          overflow: 'hidden',
          borderTopLeftRadius: '0.5rem',
          borderTopRightRadius: '0.5rem',
          border: '1px solid var(--sb-border)',
          borderBottom: 'none',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${headerOffset}px`,
            top: 0,
            width: `${tripleWidth}px`,
            height: `${HEADER_HEIGHT}px`,
          }}
        >
          {renderHeaderCopy(0, 'l')}
          {renderHeaderCopy(boardWidth, 'c')}
          {renderHeaderCopy(boardWidth * 2, 'r')}
        </div>
      </div>

      {/* Board */}
      <div
        ref={containerRef}
        style={{
          width: `${VIEWPORT_WIDTH}px`,
          height: `${boardHeight}px`,
          overflow: 'hidden',
          borderBottomLeftRadius: '0.5rem',
          borderBottomRightRadius: '0.5rem',
          border: '1px solid var(--sb-border)',
          borderTop: 'none',
          position: 'relative',
          backgroundColor: '#1a1d27',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            width: `${tripleWidth}px`,
            height: `${boardHeight}px`,
            position: 'relative',
          }}
        >
          {renderBoardCopy(0, 'l')}
          {renderBoardCopy(boardWidth, 'c')}
          {renderBoardCopy(boardWidth * 2, 'r')}
        </div>
      </div>

      <p className="text-[10px] text-[var(--sb-text-muted)] mt-2 text-center select-none">
        ← 拖拽滚动查看全部区域 · 首尾相接 →
      </p>
    </div>
  );
}
