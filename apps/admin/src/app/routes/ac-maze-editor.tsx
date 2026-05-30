import { useState, useMemo, useCallback } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coordKey } from '@brain-games/game-engine';
import type { AbsoluteCommandCell, AbsoluteCommandDirection, AbsoluteCommandRuntimeState, MazeCoord } from '@brain-games/game-engine';
import { AbsoluteCommandMaze3D } from '../../components/game/AbsoluteCommandMaze3D';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { apiRequest } from '../../lib/api-client';

// ─── Constants ──────────────────────────────────────────────────────

const CELL_TYPES = [
  { key: 'NORMAL', label: '普通', color: 'bg-[#b4c8dc]/30 border-[#b4c8dc]/40', short: '' },
  { key: 'START', label: '起点', color: 'bg-green-500/50 border-green-500', short: 'S' },
  { key: 'YELLOW_STOP', label: '黄色停止', color: 'bg-yellow-400/60 border-yellow-500', short: 'Y' },
  { key: 'NUMBER', label: '数字', color: 'bg-blue-400/30 border-blue-400/60', short: '#' },
  { key: 'INITIAL_RED', label: '红色阻挡', color: 'bg-red-500/70 border-red-600', short: 'R' },
  { key: 'DISABLED', label: '禁用', color: 'bg-gray-800/40 border-gray-700', short: 'X' },
] as const;

interface MazeSize { width: number; height: number; depth: number; }

// ─── Helper: create preview state from cells ────────────────────────

function createPreviewState(cells: AbsoluteCommandCell[], startCoord: MazeCoord): AbsoluteCommandRuntimeState {
  const redCells: string[] = [];
  const numberStates: AbsoluteCommandRuntimeState['numberStates'] = [];
  for (const cell of cells) {
    if (cell.type === 'INITIAL_RED') redCells.push(coordKey(cell.coord));
    if (cell.type === 'NUMBER' && cell.requiredPasses) {
      numberStates.push({ coord: cell.coord, requiredPasses: cell.requiredPasses, remainingPasses: cell.requiredPasses });
    }
  }
  return {
    position: startCoord,
    visitedCells: [coordKey(startCoord)],
    redCells,
    numberStates,
    commandCount: 0,
    travelDistance: 0,
    commandHistory: [],
    completed: false,
  };
}

// ─── Helper: filter cells to fit within new size ────────────────────

function filterCellsToSize(grid: Map<string, AbsoluteCommandCell>, size: MazeSize): Map<string, AbsoluteCommandCell> {
  const next = new Map<string, AbsoluteCommandCell>();
  for (const [key, cell] of grid) {
    const { x, y, z } = cell.coord;
    if (x < size.width && y < size.height && z < size.depth) {
      next.set(key, cell);
    }
  }
  return next;
}

// ─── Main Page ──────────────────────────────────────────────────────

interface ACMazeEditorPageProps {
  puzzleId?: string;
}

export default function ACMazeEditorPage({ puzzleId: puzzleIdProp }: ACMazeEditorPageProps) {
  const { openTab } = useTabStore();
  const puzzleId = puzzleIdProp || '';
  const queryClient = useQueryClient();

  const { data: puzzle, isLoading } = useQuery({
    queryKey: ['admin-ac-puzzle', puzzleId],
    queryFn: () => apiRequest<any>(`/admin/absolute-command/puzzles/${puzzleId}`),
    enabled: !!puzzleId,
  });

  const latestVersion = puzzle?.versions?.[0];
  const initialSize: MazeSize = (latestVersion?.size as MazeSize) || { width: 8, height: 8, depth: 3 };

  // ─── State ──────────────────────────────────────────────────────

  const [mazeSize, setMazeSize] = useState<MazeSize>(initialSize);
  const [cellGrid, setCellGrid] = useState<Map<string, AbsoluteCommandCell>>(() => {
    const grid = new Map<string, AbsoluteCommandCell>();
    const start: MazeCoord = (latestVersion?.startCoord as MazeCoord) || { x: 0, y: 0, z: 0 };
    if (latestVersion?.cells) {
      for (const c of latestVersion.cells as AbsoluteCommandCell[]) {
        if (c.type !== 'NORMAL') grid.set(coordKey(c.coord), { ...c });
      }
    }
    if (!grid.has(coordKey(start))) grid.set(coordKey(start), { coord: start, type: 'START' });
    return grid;
  });
  const [startCoord, setStartCoord] = useState<MazeCoord>((latestVersion?.startCoord as MazeCoord) || { x: 0, y: 0, z: 0 });
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedTool, setSelectedTool] = useState<string>('YELLOW_STOP');
  const [showSolution, setShowSolution] = useState(false);
  const [solution, setSolution] = useState<AbsoluteCommandDirection[]>((latestVersion?.referenceSolution as AbsoluteCommandDirection[]) || []);

  // Reset when version changes
  useMemo(() => {
    if (!latestVersion) return;
    const size = (latestVersion.size as MazeSize) || { width: 8, height: 8, depth: 3 };
    setMazeSize(size);
    const grid = new Map<string, AbsoluteCommandCell>();
    const start: MazeCoord = (latestVersion.startCoord as MazeCoord) || { x: 0, y: 0, z: 0 };
    if (latestVersion.cells) {
      for (const c of latestVersion.cells as AbsoluteCommandCell[]) {
        if (c.type !== 'NORMAL') grid.set(coordKey(c.coord), { ...c });
      }
    }
    if (!grid.has(coordKey(start))) grid.set(coordKey(start), { coord: start, type: 'START' });
    setCellGrid(grid);
    setStartCoord(start);
    setSolution((latestVersion.referenceSolution as AbsoluteCommandDirection[]) || []);
  }, [latestVersion?.id]);

  // ─── Size change handler ────────────────────────────────────────

  function handleSizeChange(dimension: 'width' | 'height' | 'depth', value: number) {
    const maxSize = dimension === 'depth' ? 5 : 10;
    const clamped = Math.max(1, Math.min(maxSize, value));
    const newSize = { ...mazeSize, [dimension]: clamped };
    setMazeSize(newSize);

    // Filter cells that are out of bounds in the new size
    setCellGrid(prev => {
      const filtered = filterCellsToSize(prev, newSize);
      // If start coord is out of bounds, move it to origin
      if (startCoord.x >= newSize.width || startCoord.y >= newSize.height || startCoord.z >= newSize.depth) {
        const newStart: MazeCoord = { x: 0, y: 0, z: 0 };
        filtered.delete(coordKey(startCoord));
        if (!filtered.has(coordKey(newStart))) {
          filtered.set(coordKey(newStart), { coord: newStart, type: 'START' });
        }
        setStartCoord(newStart);
      }
      return filtered;
    });
  }

  // ─── Cell click handler ─────────────────────────────────────────

  function handleCellClick(x: number, y: number) {
    const coord: MazeCoord = { x, y, z: activeLayer };
    const key = coordKey(coord);
    setCellGrid(prev => {
      const next = new Map(prev);
      if (selectedTool === 'START') {
        next.delete(coordKey(startCoord));
        next.set(key, { coord, type: 'START' });
        setStartCoord(coord);
      } else if (selectedTool === 'NORMAL') {
        next.delete(key);
      } else {
        const existing = next.get(key);
        if (existing?.type === selectedTool) next.delete(key);
        else {
          const cell: AbsoluteCommandCell = { coord, type: selectedTool as any, ...(selectedTool === 'NUMBER' ? { requiredPasses: 2 } : {}) };
          next.set(key, cell);
        }
      }
      return next;
    });
  }

  function handleNumChange(key: string, val: number) {
    setCellGrid(prev => {
      const next = new Map(prev);
      const c = next.get(key);
      if (c?.type === 'NUMBER') next.set(key, { ...c, requiredPasses: Math.max(1, val) });
      return next;
    });
  }

  function handleReset() {
    if (!latestVersion) return;
    const size = (latestVersion.size as MazeSize) || { width: 8, height: 8, depth: 3 };
    setMazeSize(size);
    const grid = new Map<string, AbsoluteCommandCell>();
    const start: MazeCoord = (latestVersion.startCoord as MazeCoord) || { x: 0, y: 0, z: 0 };
    if (latestVersion.cells) {
      for (const c of latestVersion.cells as AbsoluteCommandCell[]) {
        if (c.type !== 'NORMAL') grid.set(coordKey(c.coord), { ...c });
      }
    }
    if (!grid.has(coordKey(start))) grid.set(coordKey(start), { coord: start, type: 'START' });
    setCellGrid(grid);
    setStartCoord(start);
  }

  // ─── Build cells array for save/preview ──────────────────────────

  const cellsArray = useMemo((): AbsoluteCommandCell[] => {
    return Array.from(cellGrid.values());
  }, [cellGrid]);

  const previewState = useMemo(() => createPreviewState(cellsArray, startCoord), [cellsArray, startCoord]);

  // ─── Mutations ───────────────────────────────────────────────────

  const saveVersionMutation = useMutation({
    mutationFn: () => apiRequest(`/admin/absolute-command/puzzles/${puzzleId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        size: mazeSize,
        cells: cellsArray,
        startCoord,
        referenceSolution: solution.length > 0 ? solution : undefined,
      }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ac-puzzle', puzzleId] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiRequest(`/admin/absolute-command/puzzles/${puzzleId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ac-puzzle', puzzleId] });
      queryClient.invalidateQueries({ queryKey: ['admin-puzzles'] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => apiRequest(`/admin/absolute-command/puzzles/${puzzleId}/unpublish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ac-puzzle', puzzleId] });
      queryClient.invalidateQueries({ queryKey: ['admin-puzzles'] });
    },
  });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!puzzle) return <div className="p-6 text-[var(--sb-text-muted)]">题目未找到</div>;

  const toolInfo = CELL_TYPES.find(t => t.key === selectedTool);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' })} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-1 inline-block">&larr; 返回题库</button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{puzzle.title}</h1>
            <Badge variant={puzzle.status === 'PUBLISHED' ? 'success' : 'warning'}>{puzzle.status === 'PUBLISHED' ? '已发布' : '草稿'}</Badge>
            {puzzle.difficultyLabel && <Badge variant="default">{puzzle.difficultyLabel}</Badge>}
          </div>
          <p className="text-xs text-[var(--sb-text-muted)] mt-1 font-mono">{puzzle.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
            const editPath = `/puzzles/absolute-command/${puzzleId}/edit`;
            openTab({ id: editPath, title: '编辑信息', path: editPath });
          }}>编辑信息</Button>
          <Button variant="secondary" onClick={() => saveVersionMutation.mutate()} disabled={saveVersionMutation.isPending}>
            {saveVersionMutation.isPending ? '保存中...' : '保存'}
          </Button>
          {puzzle.status === 'PUBLISHED' ? (
            <Button variant="danger" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>撤下</Button>
          ) : (
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>发布</Button>
          )}
        </div>
      </div>

      {/* Main split layout: editor left, 3D preview right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* Left: 2D Layer Editor */}
        <Card className="p-4">
          <div className="space-y-3">
            {/* Maze size controls */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--sb-text-secondary)] font-medium">迷宫大小：</span>
              <label className="flex items-center gap-1 text-xs text-[var(--sb-text-muted)]">
                长
                <input type="number" min={1} max={10} value={mazeSize.width}
                  onChange={e => handleSizeChange('width', parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" />
              </label>
              <label className="flex items-center gap-1 text-xs text-[var(--sb-text-muted)]">
                宽
                <input type="number" min={1} max={10} value={mazeSize.height}
                  onChange={e => handleSizeChange('height', parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" />
              </label>
              <label className="flex items-center gap-1 text-xs text-[var(--sb-text-muted)]">
                高
                <input type="number" min={1} max={5} value={mazeSize.depth}
                  onChange={e => handleSizeChange('depth', parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" />
              </label>
            </div>

            {/* Tool palette */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--sb-text-secondary)] font-medium">工具：</span>
              {CELL_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTool(t.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border cursor-pointer ${t.color} ${selectedTool === t.key ? 'ring-2 ring-[var(--sb-primary)] ring-offset-1 ring-offset-[var(--sb-bg)]' : ''}`}
                >
                  {t.label}
                </button>
              ))}
              <Button size="sm" variant="ghost" onClick={handleReset}>重置</Button>
            </div>

            {/* Layer tabs */}
            <div className="flex gap-2">
              {Array.from({ length: mazeSize.depth }, (_, z) => (
                <button
                  key={z}
                  onClick={() => setActiveLayer(z)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${activeLayer === z ? 'bg-[var(--sb-primary)] text-white' : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)]'}`}
                >
                  Layer {z} (z={z})
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="inline-block border border-[var(--sb-border)] rounded-lg overflow-hidden">
              <div className="flex">
                <div className="w-8" />
                {Array.from({ length: mazeSize.width }, (_, x) => (
                  <div key={x} className="w-12 text-center text-xs text-[var(--sb-text-muted)] py-1">X={x}</div>
                ))}
              </div>
              {Array.from({ length: mazeSize.height }, (_, y) => (
                <div key={y} className="flex">
                  <div className="w-8 flex items-center justify-center text-xs text-[var(--sb-text-muted)]">Y={y}</div>
                  {Array.from({ length: mazeSize.width }, (_, x) => {
                    const coord: MazeCoord = { x, y, z: activeLayer };
                    const key = coordKey(coord);
                    const cell = cellGrid.get(key);
                    const t = CELL_TYPES.find(ct => ct.key === (cell?.type || 'NORMAL')) || CELL_TYPES[0];

                    return (
                      <button
                        key={key}
                        onClick={() => handleCellClick(x, y)}
                        className={`w-12 h-12 border border-[var(--sb-border)] cursor-pointer transition-all hover:brightness-110 relative flex items-center justify-center ${t.color}`}
                        title={`(${x},${y},${activeLayer}) ${t.label}`}
                      >
                        {cell?.type === 'NUMBER' && cell.requiredPasses && (
                          <input
                            type="number"
                            min={1}
                            max={9}
                            value={cell.requiredPasses}
                            onChange={e => { e.stopPropagation(); handleNumChange(key, parseInt(e.target.value) || 1); }}
                            onClick={e => e.stopPropagation()}
                            className="w-7 h-7 text-center text-sm font-bold bg-transparent border-none outline-none text-red-600 cursor-text"
                          />
                        )}
                        {t.short && cell?.type !== 'NUMBER' && (
                          <span className="text-xs font-bold">{t.short}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Current tool hint */}
            <p className="text-xs text-[var(--sb-text-muted)]">
              当前工具：<span className="font-medium text-[var(--sb-text-primary)]">{toolInfo?.label}</span>
              {' '}— 点击格子放置，再次点击移除
            </p>
          </div>
        </Card>

        {/* Right: 3D Preview */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-2">3D 预览</h3>
          <div className="rounded-lg overflow-hidden border border-[var(--sb-border)]" style={{ height: '500px' }}>
            <AbsoluteCommandMaze3D
              cells={cellsArray}
              size={mazeSize}
              state={previewState}
            />
          </div>
          <p className="text-xs text-[var(--sb-text-muted)] mt-2">拖拽旋转视角，滚轮缩放</p>
        </Card>
      </div>

      {/* Bottom: Reference Solution (collapsible) */}
      <Card className="p-4">
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)] cursor-pointer w-full text-left"
        >
          <span className={`transition-transform ${showSolution ? 'rotate-90' : ''}`}>▶</span>
          参考解法 ({solution.length} 步)
        </button>
        {showSolution && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'X_POS', label: '右 X+' },
                { key: 'X_NEG', label: '左 X-' },
                { key: 'Y_POS', label: '后 Y+' },
                { key: 'Y_NEG', label: '前 Y-' },
                { key: 'Z_POS', label: '上 Z+' },
                { key: 'Z_NEG', label: '下 Z-' },
              ] as const).map(d => (
                <Button key={d.key} size="sm" variant="secondary" onClick={() => setSolution(s => [...s, d.key])}>
                  {d.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSolution(s => s.slice(0, -1))} disabled={!solution.length}>撤销</Button>
              <Button size="sm" variant="ghost" onClick={() => setSolution([])} disabled={!solution.length}>清空</Button>
            </div>
            {solution.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {solution.map((d, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-1 text-xs font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded">
                    {i + 1}. {d.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
