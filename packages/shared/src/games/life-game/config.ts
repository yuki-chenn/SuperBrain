export const LIFE_GAME_DIFFICULTIES = [
  {
    key: 'easy',
    label: '入门',
    targetRegionCount: 1,
    description: '推理 1 个目标区域',
    maxDurationMs: 8 * 60 * 1000,
  },
  {
    key: 'normal',
    label: '标准',
    targetRegionCount: 2,
    description: '推理 2 个目标区域',
    maxDurationMs: 12 * 60 * 1000,
  },
  {
    key: 'hard',
    label: '挑战',
    targetRegionCount: 3,
    description: '推理 3 个目标区域',
    maxDurationMs: 16 * 60 * 1000,
  },
] as const;

export const LIFE_MAX_ERROR_COUNT = 100;

export function getLifeGameMaxDurationMs(difficultyKey: string): number {
  const difficulty = LIFE_GAME_DIFFICULTIES.find((d) => d.key === difficultyKey);
  if (!difficulty) {
    throw new Error(`Invalid life-game difficulty: ${difficultyKey}`);
  }
  return difficulty.maxDurationMs;
}
