import {
  getSlidingPuzzleMaxDurationMs,
  getLifeGameMaxDurationMs,
  getPCBMaxDurationMs,
} from '@brain-games/shared';

export function getGameMaxDurationMs(gameSlug: string, difficultyKey: string): number {
  if (gameSlug === 'sliding-puzzle') {
    return getSlidingPuzzleMaxDurationMs(difficultyKey);
  }
  if (gameSlug === 'life-game') {
    return getLifeGameMaxDurationMs(difficultyKey);
  }
  if (gameSlug === 'precise-character-building') {
    return getPCBMaxDurationMs(difficultyKey);
  }
  throw new Error(`Unsupported game slug: ${gameSlug}`);
}

export function isAttemptTimedOut(startedAt: Date, maxDurationMs: number, now = new Date()): boolean {
  return now.getTime() - startedAt.getTime() >= maxDurationMs;
}
