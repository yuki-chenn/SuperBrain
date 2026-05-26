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

/**
 * Single hard rule for ALL difficulties: the puzzle MUST stabilise within
 * `MAX_STABLE_GENERATION` generations. Differences between easy / normal /
 * hard come purely from how many target regions the player must reason
 * about (1 / 2 / 3), defined in `LIFE_GAME_DIFFICULTIES.targetRegionCount`.
 */
const MAX_STABLE_GENERATION = 100;

/**
 * Lower bound excludes trivial "already stable" puzzles (gen=1 means the
 * initial board IS stable — nothing to reason about).
 */
const MIN_STABLE_GENERATION = 2;

/**
 * Density sweep used for ALL difficulties. Sparse boards usually die out
 * fast, dense boards tend to oscillate. The mid-band is most likely to
 * produce fixed-point stability within 100 generations.
 */
const DENSITIES = [0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22];

/** Hard cap on retries per puzzle generation request. */
const MAX_ATTEMPTS = 250;

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

/**
 * Acceptance criteria (same for all difficulties):
 *   - simulateUntilStable status === 'STABLE' (no oscillators, no extinction)
 *   - 2 ≤ stableGeneration ≤ 100
 *   - stable board has live cells
 *   - enough non-empty regions to host targetRegionCount
 *
 * `difficultyKey` is accepted for backward compatibility but no longer
 * gates generation logic. The caller passes `targetRegionCount` to express
 * the difficulty.
 */
export function generateValidLifePuzzle(
  seed: string,
  _difficultyKey: string,
  targetRegionCount: number,
): LifeSeedPuzzle | null {
  const regions = getLifeRegions();
  // Cap simulation slightly above the hard rule so we waste no work.
  const simulationCap = MAX_STABLE_GENERATION + 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const density = DENSITIES[attempt % DENSITIES.length];
    const boardSeed = `${seed}-${attempt}`;
    const initialState = generateRandomBoard(boardSeed, density);

    if (initialState.aliveCells.length === 0) continue;

    const result = simulateUntilStable({
      initialState,
      boundary: DEFAULT_LIFE_BOUNDARY_RULE,
      maxGenerations: simulationCap,
    });

    if (result.status !== 'STABLE' || !result.stableState) continue;

    const gen = result.generations;
    if (gen < MIN_STABLE_GENERATION || gen > MAX_STABLE_GENERATION) continue;

    if (result.stableState.aliveCells.length === 0) continue;

    const regionsWithCells = regions.filter((region) => {
      const answer = extractRegionAnswer(result.stableState!, region.id);
      return answer.length > 0 && answer.length <= 80;
    });

    if (regionsWithCells.length < targetRegionCount) continue;

    // Deterministic shuffle so the same seed always picks the same region set.
    const shuffleRand = mulberry32(xmur3(`${boardSeed}-shuffle`)());
    const shuffled = [...regionsWithCells];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedRegions = shuffled.slice(0, targetRegionCount);
    console.log(
      `  Puzzle regions: [${selectedRegions.map((r) => r.id).join(', ')}] from ${regionsWithCells.length} candidates · stable@${gen}`,
    );

    return {
      initialState,
      stableState: result.stableState,
      targetRegionIds: selectedRegions.map((r) => r.id),
      targetAnswers: selectedRegions.map((region) => ({
        regionId: region.id,
        aliveCells: extractRegionAnswer(result.stableState!, region.id),
      })),
      stableGeneration: result.generations,
    };
  }

  return null;
}
