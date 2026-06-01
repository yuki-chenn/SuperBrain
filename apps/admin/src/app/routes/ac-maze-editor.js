import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coordKey } from '@brain-games/game-engine';
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
];
// ─── Helper: create preview state from cells ────────────────────────
function createPreviewState(cells, startCoord) {
    const redCells = [];
    const numberStates = [];
    for (const cell of cells) {
        if (cell.type === 'INITIAL_RED')
            redCells.push(coordKey(cell.coord));
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
function filterCellsToSize(grid, size) {
    const next = new Map();
    for (const [key, cell] of grid) {
        const { x, y, z } = cell.coord;
        if (x < size.width && y < size.height && z < size.depth) {
            next.set(key, cell);
        }
    }
    return next;
}
export default function ACMazeEditorPage({ puzzleId: puzzleIdProp }) {
    const { openTab } = useTabStore();
    const puzzleId = puzzleIdProp || '';
    const queryClient = useQueryClient();
    const { data: puzzle, isLoading } = useQuery({
        queryKey: ['admin-ac-puzzle', puzzleId],
        queryFn: () => apiRequest(`/admin/absolute-command/puzzles/${puzzleId}`),
        enabled: !!puzzleId,
    });
    const latestVersion = puzzle?.versions?.[0];
    const initialSize = latestVersion?.size || { width: 8, height: 8, depth: 3 };
    // ─── State ──────────────────────────────────────────────────────
    const [mazeSize, setMazeSize] = useState(initialSize);
    const [cellGrid, setCellGrid] = useState(() => {
        const grid = new Map();
        const start = latestVersion?.startCoord || { x: 0, y: 0, z: 0 };
        if (latestVersion?.cells) {
            for (const c of latestVersion.cells) {
                if (c.type !== 'NORMAL')
                    grid.set(coordKey(c.coord), { ...c });
            }
        }
        if (!grid.has(coordKey(start)))
            grid.set(coordKey(start), { coord: start, type: 'START' });
        return grid;
    });
    const [startCoord, setStartCoord] = useState(latestVersion?.startCoord || { x: 0, y: 0, z: 0 });
    const [activeLayer, setActiveLayer] = useState(0);
    const [selectedTool, setSelectedTool] = useState('YELLOW_STOP');
    const [showSolution, setShowSolution] = useState(false);
    const [solution, setSolution] = useState(latestVersion?.referenceSolution || []);
    // Reset when version changes
    useMemo(() => {
        if (!latestVersion)
            return;
        const size = latestVersion.size || { width: 8, height: 8, depth: 3 };
        setMazeSize(size);
        const grid = new Map();
        const start = latestVersion.startCoord || { x: 0, y: 0, z: 0 };
        if (latestVersion.cells) {
            for (const c of latestVersion.cells) {
                if (c.type !== 'NORMAL')
                    grid.set(coordKey(c.coord), { ...c });
            }
        }
        if (!grid.has(coordKey(start)))
            grid.set(coordKey(start), { coord: start, type: 'START' });
        setCellGrid(grid);
        setStartCoord(start);
        setSolution(latestVersion.referenceSolution || []);
    }, [latestVersion?.id]);
    // ─── Size change handler ────────────────────────────────────────
    function handleSizeChange(dimension, value) {
        const maxSize = dimension === 'depth' ? 5 : 10;
        const clamped = Math.max(1, Math.min(maxSize, value));
        const newSize = { ...mazeSize, [dimension]: clamped };
        setMazeSize(newSize);
        // Filter cells that are out of bounds in the new size
        setCellGrid(prev => {
            const filtered = filterCellsToSize(prev, newSize);
            // If start coord is out of bounds, move it to origin
            if (startCoord.x >= newSize.width || startCoord.y >= newSize.height || startCoord.z >= newSize.depth) {
                const newStart = { x: 0, y: 0, z: 0 };
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
    function handleCellClick(x, y) {
        const coord = { x, y, z: activeLayer };
        const key = coordKey(coord);
        setCellGrid(prev => {
            const next = new Map(prev);
            if (selectedTool === 'START') {
                next.delete(coordKey(startCoord));
                next.set(key, { coord, type: 'START' });
                setStartCoord(coord);
            }
            else if (selectedTool === 'NORMAL') {
                next.delete(key);
            }
            else {
                const existing = next.get(key);
                if (existing?.type === selectedTool)
                    next.delete(key);
                else {
                    const cell = { coord, type: selectedTool, ...(selectedTool === 'NUMBER' ? { requiredPasses: 2 } : {}) };
                    next.set(key, cell);
                }
            }
            return next;
        });
    }
    function handleNumChange(key, val) {
        setCellGrid(prev => {
            const next = new Map(prev);
            const c = next.get(key);
            if (c?.type === 'NUMBER')
                next.set(key, { ...c, requiredPasses: Math.max(1, val) });
            return next;
        });
    }
    function handleReset() {
        if (!latestVersion)
            return;
        const size = latestVersion.size || { width: 8, height: 8, depth: 3 };
        setMazeSize(size);
        const grid = new Map();
        const start = latestVersion.startCoord || { x: 0, y: 0, z: 0 };
        if (latestVersion.cells) {
            for (const c of latestVersion.cells) {
                if (c.type !== 'NORMAL')
                    grid.set(coordKey(c.coord), { ...c });
            }
        }
        if (!grid.has(coordKey(start)))
            grid.set(coordKey(start), { coord: start, type: 'START' });
        setCellGrid(grid);
        setStartCoord(start);
    }
    // ─── Build cells array for save/preview ──────────────────────────
    const cellsArray = useMemo(() => {
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
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!puzzle)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u9898\u76EE\u672A\u627E\u5230" });
    const toolInfo = CELL_TYPES.find(t => t.key === selectedTool);
    return (_jsxs("div", { className: "p-6 max-w-[1600px] mx-auto space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("button", { onClick: () => openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' }), className: "text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-1 inline-block", children: "\u2190 \u8FD4\u56DE\u9898\u5E93" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: puzzle.title }), _jsx(Badge, { variant: puzzle.status === 'PUBLISHED' ? 'success' : 'warning', children: puzzle.status === 'PUBLISHED' ? '已发布' : '草稿' }), puzzle.difficultyLabel && _jsx(Badge, { variant: "default", children: puzzle.difficultyLabel })] }), _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] mt-1 font-mono", children: puzzle.slug })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => {
                                    const editPath = `/puzzles/absolute-command/${puzzleId}/edit`;
                                    openTab({ id: editPath, title: '编辑信息', path: editPath });
                                }, children: "\u7F16\u8F91\u4FE1\u606F" }), _jsx(Button, { variant: "secondary", onClick: () => saveVersionMutation.mutate(), disabled: saveVersionMutation.isPending, children: saveVersionMutation.isPending ? '保存中...' : '保存' }), puzzle.status === 'PUBLISHED' ? (_jsx(Button, { variant: "danger", onClick: () => unpublishMutation.mutate(), disabled: unpublishMutation.isPending, children: "\u64A4\u4E0B" })) : (_jsx(Button, { onClick: () => publishMutation.mutate(), disabled: publishMutation.isPending, children: "\u53D1\u5E03" }))] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4", children: [_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("span", { className: "text-sm text-[var(--sb-text-secondary)] font-medium", children: "\u8FF7\u5BAB\u5927\u5C0F\uFF1A" }), _jsxs("label", { className: "flex items-center gap-1 text-xs text-[var(--sb-text-muted)]", children: ["\u957F", _jsx("input", { type: "number", min: 1, max: 10, value: mazeSize.width, onChange: e => handleSizeChange('width', parseInt(e.target.value) || 1), className: "w-14 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" })] }), _jsxs("label", { className: "flex items-center gap-1 text-xs text-[var(--sb-text-muted)]", children: ["\u5BBD", _jsx("input", { type: "number", min: 1, max: 10, value: mazeSize.height, onChange: e => handleSizeChange('height', parseInt(e.target.value) || 1), className: "w-14 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" })] }), _jsxs("label", { className: "flex items-center gap-1 text-xs text-[var(--sb-text-muted)]", children: ["\u9AD8", _jsx("input", { type: "number", min: 1, max: 5, value: mazeSize.depth, onChange: e => handleSizeChange('depth', parseInt(e.target.value) || 1), className: "w-14 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-sm text-[var(--sb-text-secondary)] font-medium", children: "\u5DE5\u5177\uFF1A" }), CELL_TYPES.map(t => (_jsx("button", { onClick: () => setSelectedTool(t.key), className: `px-2.5 py-1 text-xs font-medium rounded-lg border cursor-pointer ${t.color} ${selectedTool === t.key ? 'ring-2 ring-[var(--sb-primary)] ring-offset-1 ring-offset-[var(--sb-bg)]' : ''}`, children: t.label }, t.key))), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleReset, children: "\u91CD\u7F6E" })] }), _jsx("div", { className: "flex gap-2", children: Array.from({ length: mazeSize.depth }, (_, z) => (_jsxs("button", { onClick: () => setActiveLayer(z), className: `px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${activeLayer === z ? 'bg-[var(--sb-primary)] text-white' : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)]'}`, children: ["Layer ", z, " (z=", z, ")"] }, z))) }), _jsxs("div", { className: "inline-block border border-[var(--sb-border)] rounded-lg overflow-hidden", children: [_jsxs("div", { className: "flex", children: [_jsx("div", { className: "w-8" }), Array.from({ length: mazeSize.width }, (_, x) => (_jsxs("div", { className: "w-12 text-center text-xs text-[var(--sb-text-muted)] py-1", children: ["X=", x] }, x)))] }), Array.from({ length: mazeSize.height }, (_, y) => (_jsxs("div", { className: "flex", children: [_jsxs("div", { className: "w-8 flex items-center justify-center text-xs text-[var(--sb-text-muted)]", children: ["Y=", y] }), Array.from({ length: mazeSize.width }, (_, x) => {
                                                    const coord = { x, y, z: activeLayer };
                                                    const key = coordKey(coord);
                                                    const cell = cellGrid.get(key);
                                                    const t = CELL_TYPES.find(ct => ct.key === (cell?.type || 'NORMAL')) || CELL_TYPES[0];
                                                    return (_jsxs("button", { onClick: () => handleCellClick(x, y), className: `w-12 h-12 border border-[var(--sb-border)] cursor-pointer transition-all hover:brightness-110 relative flex items-center justify-center ${t.color}`, title: `(${x},${y},${activeLayer}) ${t.label}`, children: [cell?.type === 'NUMBER' && cell.requiredPasses && (_jsx("input", { type: "number", min: 1, max: 9, value: cell.requiredPasses, onChange: e => { e.stopPropagation(); handleNumChange(key, parseInt(e.target.value) || 1); }, onClick: e => e.stopPropagation(), className: "w-7 h-7 text-center text-sm font-bold bg-transparent border-none outline-none text-red-600 cursor-text" })), t.short && cell?.type !== 'NUMBER' && (_jsx("span", { className: "text-xs font-bold", children: t.short }))] }, key));
                                                })] }, y)))] }), _jsxs("p", { className: "text-xs text-[var(--sb-text-muted)]", children: ["\u5F53\u524D\u5DE5\u5177\uFF1A", _jsx("span", { className: "font-medium text-[var(--sb-text-primary)]", children: toolInfo?.label }), ' ', "\u2014 \u70B9\u51FB\u683C\u5B50\u653E\u7F6E\uFF0C\u518D\u6B21\u70B9\u51FB\u79FB\u9664"] })] }) }), _jsxs(Card, { className: "p-4", children: [_jsx("h3", { className: "text-sm font-semibold text-[var(--sb-text-secondary)] mb-2", children: "3D \u9884\u89C8" }), _jsx("div", { className: "rounded-lg overflow-hidden border border-[var(--sb-border)]", style: { height: '500px' }, children: _jsx(AbsoluteCommandMaze3D, { cells: cellsArray, size: mazeSize, state: previewState }) }), _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] mt-2", children: "\u62D6\u62FD\u65CB\u8F6C\u89C6\u89D2\uFF0C\u6EDA\u8F6E\u7F29\u653E" })] })] }), _jsxs(Card, { className: "p-4", children: [_jsxs("button", { onClick: () => setShowSolution(!showSolution), className: "flex items-center gap-2 text-sm font-medium text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)] cursor-pointer w-full text-left", children: [_jsx("span", { className: `transition-transform ${showSolution ? 'rotate-90' : ''}`, children: "\u25B6" }), "\u53C2\u8003\u89E3\u6CD5 (", solution.length, " \u6B65)"] }), showSolution && (_jsxs("div", { className: "mt-3 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [[
                                        { key: 'X_POS', label: '右 X+' },
                                        { key: 'X_NEG', label: '左 X-' },
                                        { key: 'Y_POS', label: '后 Y+' },
                                        { key: 'Y_NEG', label: '前 Y-' },
                                        { key: 'Z_POS', label: '上 Z+' },
                                        { key: 'Z_NEG', label: '下 Z-' },
                                    ].map(d => (_jsx(Button, { size: "sm", variant: "secondary", onClick: () => setSolution(s => [...s, d.key]), children: d.label }, d.key))), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setSolution(s => s.slice(0, -1)), disabled: !solution.length, children: "\u64A4\u9500" }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setSolution([]), disabled: !solution.length, children: "\u6E05\u7A7A" })] }), solution.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1", children: solution.map((d, i) => (_jsxs("span", { className: "inline-flex items-center px-2 py-1 text-xs font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded", children: [i + 1, ". ", d.replace('_', ' ')] }, i))) }))] }))] })] }));
}
//# sourceMappingURL=ac-maze-editor.js.map