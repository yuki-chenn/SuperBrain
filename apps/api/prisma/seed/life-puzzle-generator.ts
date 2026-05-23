import {
  simulateUntilStable,
  extractRegionAnswer,
  getLifeRegions,
  LIFE_BOARD_WIDTH,
  LIFE_BOARD_HEIGHT,
  DEFAULT_LIFE_BOUNDARY_RULE,
} from '@brain-games/game-engine';
import type { CellCoord, LifeBoardState } from '@brain-games/game-engine';
import { mulberry32, xmur3 } from './random';

const DIFFICULTY_DENSITIES: Record<string, number[]> = {
  easy: [0.13, 0.14, 0.15],
  normal: [0.16, 0.17, 0.18, 0.19, 0.2],
  hard: [0.21, 0.215, 0.22, 0.225, 0.23, 0.235, 0.24],
};

function generateRandomBoard(seed: string, density: number): LifeBoardState {
  const rand = mulberry32(xmur3(seed)());
  const aliveCells: CellCoord[] = [];

  for (let x = 0; x < LIFE_BOARD_WIDTH; x++) {
    for (let y = 0; y < LIFE_BOARD_HEIGHT; y++) {
      if (rand() < density) {
        aliveCells.push({ x, y });
      }
    }
  }

  return {
    width: LIFE_BOARD_WIDTH,
    height: LIFE_BOARD_HEIGHT,
    aliveCells,
  };
}

export interface LifeSeedPuzzle {
  initialState: LifeBoardState;
  stableState: LifeBoardState;
  targetRegionIds: number[];
  targetAnswers: Array<{ regionId: number; aliveCells: Array<{ x: number; y: number }> }>;
  stableGeneration: number;
}

export function generateValidLifePuzzle(
  seed: string,
  difficultyKey: string,
  targetRegionCount: number,
): LifeSeedPuzzle | null {
  const densities = DIFFICULTY_DENSITIES[difficultyKey] ?? [0.15, 0.16, 0.17, 0.18, 0.19];
  const regions = getLifeRegions();

  for (let attempt = 0; attempt < 50; attempt++) {
    const density = densities[attempt % densities.length];
    const boardSeed = `${seed}-${attempt}`;
    const initialState = generateRandomBoard(boardSeed, density);

    if (initialState.aliveCells.length === 0) continue;

    const result = simulateUntilStable({
      initialState,
      boundary: DEFAULT_LIFE_BOUNDARY_RULE,
      maxGenerations: 300,
    });

    if (result.status !== 'STABLE' || !result.stableState) continue;
    if (result.stableState.aliveCells.length === 0) continue;

    const regionsWithCells = regions.filter((region) => {
      const answer = extractRegionAnswer(result.stableState, region.id);
      return answer.length > 0 && answer.length <= 80;
    });

    if (regionsWithCells.length < targetRegionCount) continue;

    const shuffleRand = mulberry32(xmur3(`${boardSeed}-shuffle`)());
    const shuffled = [...regionsWithCells];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedRegions = shuffled.slice(0, targetRegionCount);
    console.log(`  Puzzle regions: [${selectedRegions.map((r) => r.id).join(', ')}] from ${regionsWithCells.length} candidates`);

    return {
      initialState,
      stableState: result.stableState,
      targetRegionIds: selectedRegions.map((r) => r.id),
      targetAnswers: selectedRegions.map((region) => ({
        regionId: region.id,
        aliveCells: extractRegionAnswer(result.stableState, region.id),
      })),
      stableGeneration: result.generations,
    };
  }

  return null;
}
