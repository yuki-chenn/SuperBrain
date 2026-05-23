import { lifeGameDimensions } from './life-game/dimensions';
import { preciseCharacterBuildingDimensions } from './precise-character-building/dimensions';
import { slidingPuzzleDimensions } from './sliding-puzzle/dimensions';
import type { GameDimension } from './types';

export type { GameDimension };

export const GAME_DIMENSIONS: Record<string, GameDimension[]> = {
  'sliding-puzzle': slidingPuzzleDimensions,
  'life-game': lifeGameDimensions,
  'precise-character-building': preciseCharacterBuildingDimensions,
};
