export const GAME_SLUGS = {
  SLIDING_PUZZLE: 'sliding-puzzle',
  LIFE_GAME: 'life-game',
  PRECISE_CHARACTER_BUILDING: 'precise-character-building',
  ABSOLUTE_COMMAND: 'absolute-command',
} as const;

export const DIFFICULTY_KEYS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
} as const;

export const MIN_DURATION_MS = 1000;
export const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
