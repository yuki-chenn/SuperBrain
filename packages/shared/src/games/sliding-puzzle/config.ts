export const SLIDING_PUZZLE_DIFFICULTIES = [
  { key: 'easy', label: '3x3', size: 3, scrambleMoves: 60, maxDurationMs: 5 * 60 * 1000 },
  { key: 'normal', label: '4x4', size: 4, scrambleMoves: 160, maxDurationMs: 8 * 60 * 1000 },
  { key: 'hard', label: '5x5', size: 5, scrambleMoves: 300, maxDurationMs: 12 * 60 * 1000 },
] as const;

export const MAX_MOVES_LIMIT: Record<number, number> = {
  3: 2000,
  4: 10000,
  5: 30000,
};

export function getSlidingPuzzleMaxDurationMs(difficultyKey: string): number {
  const difficulty = SLIDING_PUZZLE_DIFFICULTIES.find((d) => d.key === difficultyKey);
  if (!difficulty) {
    throw new Error(`Invalid sliding-puzzle difficulty: ${difficultyKey}`);
  }
  return difficulty.maxDurationMs;
}
