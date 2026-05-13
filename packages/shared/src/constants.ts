export const GAME_SLUGS = {
  SLIDING_PUZZLE: 'sliding-puzzle',
  LIFE_GAME: 'life-game',
} as const;

export const DIFFICULTY_KEYS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
} as const;

export const SLIDING_PUZZLE_DIFFICULTIES = [
  { key: 'easy', label: '3x3', size: 3, scrambleMoves: 60 },
  { key: 'normal', label: '4x4', size: 4, scrambleMoves: 160 },
  { key: 'hard', label: '5x5', size: 5, scrambleMoves: 300 },
] as const;

export const MAX_MOVES_LIMIT: Record<number, number> = {
  3: 2000,
  4: 10000,
  5: 30000,
};

export const MIN_DURATION_MS = 1000;
export const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const LIFE_GAME_DIFFICULTIES = [
  { key: 'easy', label: '入门', targetRegionCount: 1, description: '推理 1 个目标区域' },
  { key: 'normal', label: '标准', targetRegionCount: 2, description: '推理 2 个目标区域' },
  { key: 'hard', label: '挑战', targetRegionCount: 3, description: '推理 3 个目标区域' },
] as const;

export const LIFE_MAX_ERROR_COUNT = 100;
