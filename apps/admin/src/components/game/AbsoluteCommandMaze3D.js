import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { coordKey } from '@brain-games/game-engine';
const CUBE_SIZE = 0.85;
const LAYER_SPACING = 2.0;
const CUBE_GAP = 0.08;
const COLORS = {
    normal: '#b4c8dc',
    normalVisited: '#38bdf8',
    yellow: '#facc15',
    red: '#ef4444',
    player: '#22c55e',
    numberText: '#fb174b',
    edge: '#ffffff40',
    start: '#22c55e',
    disabled: '#1e293b',
    animating: '#a78bfa',
};
function cellPosition(coord, size) {
    const spacing = CUBE_SIZE + CUBE_GAP;
    const offsetX = ((size.width - 1) * spacing) / 2;
    const offsetY = ((size.height - 1) * spacing) / 2;
    return [
        coord.x * spacing - offsetX,
        coord.z * LAYER_SPACING,
        coord.y * spacing - offsetY,
    ];
}
function MazeCube({ position, color, opacity = 1, emissive, }) {
    return (_jsxs("mesh", { position: position, children: [_jsx("boxGeometry", { args: [CUBE_SIZE, CUBE_SIZE, CUBE_SIZE] }), _jsx("meshStandardMaterial", { color: color, transparent: opacity < 1, opacity: opacity, emissive: emissive || color, emissiveIntensity: emissive ? 0.3 : 0 })] }));
}
function NumberLabel({ position, value, }) {
    return (_jsx(Text, { position: [position[0], position[1], position[2]], fontSize: 0.4, color: COLORS.numberText, fontWeight: "bold", anchorX: "center", anchorY: "middle", children: String(value) }));
}
function PlayerMarker({ position }) {
    return (_jsxs("mesh", { position: position, children: [_jsx("sphereGeometry", { args: [0.28, 16, 16] }), _jsx("meshStandardMaterial", { color: COLORS.player, emissive: COLORS.player, emissiveIntensity: 0.6 })] }));
}
function StartMarker({ position }) {
    return (_jsx(Text, { position: [position[0], position[1], position[2]], fontSize: 0.2, color: COLORS.start, anchorX: "center", anchorY: "middle", children: "S" }));
}
function AxisIndicator() {
    const origin = [-6, -1.5, -6];
    const len = 1.5;
    return (_jsxs("group", { children: [_jsx(Line, { points: [origin, [origin[0] + len, origin[1], origin[2]]], color: "#ef4444", lineWidth: 2 }), _jsx(Text, { position: [origin[0] + len + 0.3, origin[1], origin[2]], fontSize: 0.3, color: "#ef4444", anchorX: "left", anchorY: "middle", children: "X+" }), _jsx(Line, { points: [origin, [origin[0], origin[1], origin[2] + len]], color: "#22c55e", lineWidth: 2 }), _jsx(Text, { position: [origin[0], origin[1], origin[2] + len + 0.3], fontSize: 0.3, color: "#22c55e", anchorX: "center", anchorY: "bottom", children: "Y+" }), _jsx(Line, { points: [origin, [origin[0], origin[1] + len, origin[2]]], color: "#3b82f6", lineWidth: 2 }), _jsx(Text, { position: [origin[0], origin[1] + len + 0.3, origin[2]], fontSize: 0.3, color: "#3b82f6", anchorX: "center", anchorY: "bottom", children: "Z+" })] }));
}
function MazeScene({ cells, size, state, animatingCoord }) {
    const cellMap = useMemo(() => {
        const map = new Map();
        for (const cell of cells) {
            map.set(coordKey(cell.coord), cell);
        }
        return map;
    }, [cells]);
    const visitedSet = useMemo(() => new Set(state.visitedCells), [state.visitedCells]);
    const redSet = useMemo(() => new Set(state.redCells), [state.redCells]);
    const numberStateMap = useMemo(() => {
        const map = new Map();
        for (const ns of state.numberStates) {
            map.set(coordKey(ns.coord), { remaining: ns.remainingPasses });
        }
        return map;
    }, [state.numberStates]);
    const playerKey = coordKey(state.position);
    const animatingKey = animatingCoord ? coordKey(animatingCoord) : null;
    const cubes = useMemo(() => {
        const result = [];
        const { width, height, depth } = size;
        const configuredKeys = new Set(cells.map((c) => coordKey(c.coord)));
        for (const cell of cells) {
            const key = coordKey(cell.coord);
            const pos = cellPosition(cell.coord, size);
            const isVisited = visitedSet.has(key);
            const isRed = redSet.has(key);
            const isPlayer = key === playerKey;
            const isAnimating = key === animatingKey;
            if (cell.type === 'DISABLED') {
                result.push({ coord: cell.coord, position: pos, color: COLORS.disabled, opacity: 0.1 });
                continue;
            }
            if (cell.type === 'INITIAL_RED' || isRed) {
                result.push({ coord: cell.coord, position: pos, color: COLORS.red, opacity: 0.7 });
                continue;
            }
            if (isPlayer) {
                result.push({ coord: cell.coord, position: pos, color: COLORS.player, opacity: 0.15, isPlayer: true });
                continue;
            }
            if (isAnimating) {
                result.push({ coord: cell.coord, position: pos, color: COLORS.animating, opacity: 0.5, emissive: COLORS.animating });
                continue;
            }
            if (cell.type === 'YELLOW_STOP') {
                result.push({ coord: cell.coord, position: pos, color: COLORS.yellow, opacity: 0.6 });
                continue;
            }
            if (cell.type === 'NUMBER') {
                const ns = numberStateMap.get(key);
                const remaining = ns?.remaining ?? cell.requiredPasses ?? 0;
                if (remaining > 0) {
                    result.push({
                        coord: cell.coord,
                        position: pos,
                        color: isVisited ? COLORS.normalVisited : COLORS.normal,
                        opacity: isVisited ? 0.35 : 0.2,
                        isNumber: true,
                        numberValue: remaining,
                    });
                }
                else {
                    result.push({ coord: cell.coord, position: pos, color: COLORS.red, opacity: 0.7 });
                }
                continue;
            }
            if (cell.type === 'START') {
                result.push({
                    coord: cell.coord,
                    position: pos,
                    color: isVisited ? COLORS.normalVisited : COLORS.start,
                    opacity: isVisited ? 0.35 : 0.25,
                    isStart: !isPlayer,
                });
                continue;
            }
            result.push({
                coord: cell.coord,
                position: pos,
                color: isVisited ? COLORS.normalVisited : COLORS.normal,
                opacity: isVisited ? 0.35 : 0.18,
            });
        }
        for (let z = 0; z < depth; z++) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const coord = { x, y, z };
                    const key = coordKey(coord);
                    if (configuredKeys.has(key))
                        continue;
                    const pos = cellPosition(coord, size);
                    const isVisited = visitedSet.has(key);
                    const isPlayer = key === playerKey;
                    const isAnimating = key === animatingKey;
                    if (isPlayer) {
                        result.push({ coord, position: pos, color: COLORS.player, opacity: 0.15, isPlayer: true });
                    }
                    else if (isAnimating) {
                        result.push({ coord, position: pos, color: COLORS.animating, opacity: 0.5, emissive: COLORS.animating });
                    }
                    else {
                        result.push({
                            coord,
                            position: pos,
                            color: isVisited ? COLORS.normalVisited : COLORS.normal,
                            opacity: isVisited ? 0.35 : 0.18,
                        });
                    }
                }
            }
        }
        return result;
    }, [cells, size, visitedSet, redSet, numberStateMap, playerKey, animatingKey]);
    return (_jsxs(_Fragment, { children: [_jsx("ambientLight", { intensity: 0.6 }), _jsx("directionalLight", { position: [10, 15, 10], intensity: 0.8 }), _jsx("directionalLight", { position: [-5, 10, -5], intensity: 0.3 }), cubes.map((cube, i) => (_jsxs("group", { children: [_jsx(MazeCube, { position: cube.position, color: cube.color, opacity: cube.opacity, emissive: cube.emissive }), cube.isNumber && cube.numberValue !== undefined && (_jsx(NumberLabel, { position: cube.position, value: cube.numberValue })), cube.isStart && !cube.isPlayer && (_jsx(StartMarker, { position: cube.position })), cube.isPlayer && (_jsx(PlayerMarker, { position: cube.position }))] }, i))), _jsx(AxisIndicator, {}), _jsx(OrbitControls, { enablePan: false, minDistance: 5, maxDistance: 30, target: [0, LAYER_SPACING, 0], maxPolarAngle: Math.PI * 0.85 })] }));
}
export function AbsoluteCommandMaze3D(props) {
    return (_jsx("div", { style: { width: '100%', height: '100%', position: 'relative' }, children: _jsx(Canvas, { camera: { position: [9, 10, 12], fov: 45 }, style: { width: '100%', height: '100%', background: 'transparent' }, children: _jsx(MazeScene, { ...props }) }) }));
}
//# sourceMappingURL=AbsoluteCommandMaze3D.js.map