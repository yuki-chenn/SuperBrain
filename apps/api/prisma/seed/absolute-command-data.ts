import type { MazeCoord, AbsoluteCommandCell, AbsoluteCommandDirection } from '@brain-games/game-engine';

interface PuzzleSeedData {
  slug: string;
  title: string;
  description: string;
  difficultyLabel: string;
  estimatedDuration: string;
  optimalCommandCount: number;
  season: number;
  episode: number;
  source: string;
  size: { width: number; height: number; depth: number };
  startCoord: MazeCoord;
  cells: AbsoluteCommandCell[];
  referenceSolution: AbsoluteCommandDirection[];
}

function coord(x: number, y: number, z: number): MazeCoord {
  return { x, y, z };
}

// ─── Puzzle 1: Beginner ──────────────────────────────────────────────
// A simple layout encouraging horizontal sweeps on each layer.

const beginnerCells: AbsoluteCommandCell[] = [
  { coord: coord(0, 0, 0), type: 'START' },
  // Yellow stops to control movement
  { coord: coord(7, 0, 0), type: 'YELLOW_STOP' },
  { coord: coord(0, 7, 1), type: 'YELLOW_STOP' },
  { coord: coord(7, 7, 2), type: 'YELLOW_STOP' },
  // Number cells - must pass through multiple times
  { coord: coord(3, 3, 0), type: 'NUMBER', requiredPasses: 2 },
  { coord: coord(4, 4, 1), type: 'NUMBER', requiredPasses: 2 },
  // A few initial red blocks to create paths
  { coord: coord(3, 0, 0), type: 'INITIAL_RED' },
  { coord: coord(4, 7, 1), type: 'INITIAL_RED' },
];

const beginnerSolution: AbsoluteCommandDirection[] = [
  // Layer 0: sweep rows
  'Y_POS', 'X_POS', 'Y_NEG', 'X_POS', 'Y_POS', 'X_POS', 'Y_NEG', 'X_POS',
  'Y_POS', 'X_POS', 'Y_NEG', 'X_POS', 'Y_POS', 'X_POS',
  // Move to layer 1
  'Z_POS',
  // Layer 1: sweep
  'X_NEG', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG',
  'X_POS', 'Y_POS', 'X_NEG',
  // Move to layer 2
  'Z_POS',
  // Layer 2: sweep
  'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'X_NEG',
];

// ─── Puzzle 2: Standard ──────────────────────────────────────────────

const standardCells: AbsoluteCommandCell[] = [
  { coord: coord(0, 0, 0), type: 'START' },
  // Yellow stops
  { coord: coord(7, 3, 0), type: 'YELLOW_STOP' },
  { coord: coord(3, 7, 0), type: 'YELLOW_STOP' },
  { coord: coord(0, 4, 1), type: 'YELLOW_STOP' },
  { coord: coord(7, 0, 1), type: 'YELLOW_STOP' },
  { coord: coord(4, 7, 2), type: 'YELLOW_STOP' },
  // Number cells
  { coord: coord(2, 2, 0), type: 'NUMBER', requiredPasses: 2 },
  { coord: coord(5, 5, 0), type: 'NUMBER', requiredPasses: 3 },
  { coord: coord(3, 3, 1), type: 'NUMBER', requiredPasses: 2 },
  { coord: coord(6, 6, 2), type: 'NUMBER', requiredPasses: 2 },
  // Initial red blocks
  { coord: coord(4, 0, 0), type: 'INITIAL_RED' },
  { coord: coord(0, 4, 0), type: 'INITIAL_RED' },
  { coord: coord(7, 7, 1), type: 'INITIAL_RED' },
  { coord: coord(3, 0, 2), type: 'INITIAL_RED' },
];

const standardSolution: AbsoluteCommandDirection[] = [
  // Layer 0
  'Y_POS', 'X_POS', 'Y_NEG', 'X_POS', 'Y_POS', 'X_POS', 'Y_NEG', 'X_POS',
  'Y_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_NEG', 'Y_POS', 'X_NEG', 'Y_NEG',
  'X_NEG', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_NEG',
  // To layer 1
  'Z_POS',
  // Layer 1
  'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'X_POS', 'Y_NEG',
  'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS',
  // To layer 2
  'Z_POS',
  // Layer 2
  'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG',
  'X_POS',
];

// ─── Puzzle 3: Hard ──────────────────────────────────────────────────

const hardCells: AbsoluteCommandCell[] = [
  { coord: coord(0, 0, 0), type: 'START' },
  // Yellow stops - many, creating complex navigation
  { coord: coord(7, 0, 0), type: 'YELLOW_STOP' },
  { coord: coord(0, 7, 0), type: 'YELLOW_STOP' },
  { coord: coord(7, 7, 1), type: 'YELLOW_STOP' },
  { coord: coord(0, 0, 1), type: 'YELLOW_STOP' },
  { coord: coord(3, 3, 2), type: 'YELLOW_STOP' },
  { coord: coord(7, 7, 2), type: 'YELLOW_STOP' },
  // Number cells - tricky pass requirements
  { coord: coord(4, 4, 0), type: 'NUMBER', requiredPasses: 3 },
  { coord: coord(2, 6, 0), type: 'NUMBER', requiredPasses: 2 },
  { coord: coord(6, 2, 1), type: 'NUMBER', requiredPasses: 2 },
  { coord: coord(1, 5, 1), type: 'NUMBER', requiredPasses: 3 },
  { coord: coord(5, 1, 2), type: 'NUMBER', requiredPasses: 2 },
  { coord: coord(4, 6, 2), type: 'NUMBER', requiredPasses: 2 },
  // Initial red blocks - maze-like walls
  { coord: coord(3, 0, 0), type: 'INITIAL_RED' },
  { coord: coord(3, 1, 0), type: 'INITIAL_RED' },
  { coord: coord(0, 3, 0), type: 'INITIAL_RED' },
  { coord: coord(1, 3, 0), type: 'INITIAL_RED' },
  { coord: coord(5, 5, 1), type: 'INITIAL_RED' },
  { coord: coord(5, 6, 1), type: 'INITIAL_RED' },
  { coord: coord(2, 2, 2), type: 'INITIAL_RED' },
  { coord: coord(6, 6, 2), type: 'INITIAL_RED' },
];

const hardSolution: AbsoluteCommandDirection[] = [
  // Layer 0: complex path
  'Y_POS', 'X_POS', 'Y_NEG', 'X_POS', 'Y_POS', 'X_POS', 'Y_NEG', 'X_POS',
  'Y_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'Y_POS',
  'X_NEG', 'X_NEG', 'Y_NEG', 'X_NEG', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_NEG',
  // To layer 1
  'Z_POS',
  // Layer 1
  'X_POS', 'Y_POS', 'X_POS', 'Y_NEG', 'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG',
  'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'X_NEG',
  // To layer 2
  'Z_POS',
  // Layer 2
  'X_POS', 'Y_POS', 'X_NEG', 'Y_NEG', 'X_POS', 'Y_POS', 'X_POS', 'Y_NEG',
  'X_NEG', 'Y_POS', 'X_NEG',
];

export const ABSOLUTE_COMMAND_PUZZLES: PuzzleSeedData[] = [
  {
    slug: 'ac-puzzle-001',
    title: '绝对指令 · 题目 001',
    description: '入门级三维迷宫，熟悉方向指令和基本操作。',
    difficultyLabel: '入门',
    estimatedDuration: '5-15 min',
    optimalCommandCount: 30,
    season: 13,
    episode: 2,
    source: '最强大脑第十三季第二期',
    size: { width: 8, height: 8, depth: 3 },
    startCoord: coord(0, 0, 0),
    cells: beginnerCells,
    referenceSolution: [],
  },
  {
    slug: 'ac-puzzle-002',
    title: '绝对指令 · 题目 002',
    description: '标准难度，需要更精细的路径规划。',
    difficultyLabel: '标准',
    estimatedDuration: '10-25 min',
    optimalCommandCount: 45,
    season: 13,
    episode: 2,
    source: '最强大脑第十三季第二期',
    size: { width: 8, height: 8, depth: 3 },
    startCoord: coord(0, 0, 0),
    cells: standardCells,
    referenceSolution: [],
  },
  {
    slug: 'ac-puzzle-003',
    title: '绝对指令 · 题目 003',
    description: '高难度三维迷宫，红色方格构成复杂障碍。',
    difficultyLabel: '困难',
    estimatedDuration: '15-40 min',
    optimalCommandCount: 55,
    season: 13,
    episode: 2,
    source: '最强大脑第十三季第二期',
    size: { width: 8, height: 8, depth: 3 },
    startCoord: coord(0, 0, 0),
    cells: hardCells,
    referenceSolution: [],
  },
];
