export const PRECISE_CHARACTER_BUILDING_DIFFICULTIES = [
  {
    key: 'easy',
    label: '入门',
    boardSize: 6,
    picksPerRound: 4,
    radicalPoolSize: 6,
    maxDurationMs: 8 * 60 * 1000,
    adjacencyMode: 'ORTHOGONAL_4',
    allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM'],
    rootComplexity: 'LOW',
  },
  {
    key: 'normal',
    label: '标准',
    boardSize: 6,
    picksPerRound: 4,
    radicalPoolSize: 6,
    maxDurationMs: 12 * 60 * 1000,
    adjacencyMode: 'ORTHOGONAL_4',
    allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND'],
    rootComplexity: 'MEDIUM',
    recommended: true,
  },
  {
    key: 'hard',
    label: '挑战',
    boardSize: 6,
    picksPerRound: 4,
    radicalPoolSize: 6,
    maxDurationMs: 16 * 60 * 1000,
    adjacencyMode: 'ORTHOGONAL_4',
    allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND', 'SURROUND'],
    rootComplexity: 'HIGH',
  },
] as const;

export const PCB_MAX_ERROR_COUNT = 100;

export function getPCBMaxDurationMs(difficultyKey: string): number {
  const difficulty = PRECISE_CHARACTER_BUILDING_DIFFICULTIES.find(
    (d) => d.key === difficultyKey,
  );
  if (!difficulty) {
    throw new Error(`Invalid precise-character-building difficulty: ${difficultyKey}`);
  }
  return difficulty.maxDurationMs;
}
