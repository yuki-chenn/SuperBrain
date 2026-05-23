import { BOARD_SIZE, PICKS_PER_ROUND } from '@brain-games/game-engine';
import { COMBO_DATA, RADICAL_DATA, ROOT_DATA, type PCBRadicalSeed } from './pcb-data';
import { mulberry32, xmur3 } from './random';

export interface PCBCell {
  index: number;
  row: number;
  col: number;
  rootKey: string;
  rootGlyph: string;
}

export interface PCBSolutionRound {
  roundIndex: number;
  path: number[];
  radicalKeys: string[];
  resultChars: string[];
  combinationIds: string[];
}

export interface PCBGeneratedPuzzle {
  radicalPool: PCBRadicalSeed[];
  cells: PCBCell[];
  solutionRounds: PCBSolutionRound[];
}

function pickRootsForBoard(
  validRoots: Array<{ key: string; glyph: string; complexityLevel: string }>,
  boardCellCount: number,
  rand: () => number,
) {
  const picked: Array<{ key: string; glyph: string; complexityLevel: string }> = [];

  // Build shuffled "bags" repeatedly so every root is consumed before the next cycle.
  // This strongly reduces local hotspots caused by pure random with-replacement sampling.
  while (picked.length < boardCellCount) {
    const bag = [...validRoots];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    picked.push(...bag);
  }

  return picked.slice(0, boardCellCount);
}

function generateSerpentPath(): number[][] {
  const path: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < BOARD_SIZE; col++) path.push(row * BOARD_SIZE + col);
    } else {
      for (let col = BOARD_SIZE - 1; col >= 0; col--) path.push(row * BOARD_SIZE + col);
    }
  }

  const rounds: number[][] = [];
  const roundCount = (BOARD_SIZE * BOARD_SIZE) / PICKS_PER_ROUND;
  for (let i = 0; i < roundCount; i++) {
    rounds.push(path.slice(i * PICKS_PER_ROUND, (i + 1) * PICKS_PER_ROUND));
  }
  return rounds;
}

function assignRadicalsToRounds(
  rounds: number[][],
  radicalPool: PCBRadicalSeed[],
  comboMap: Map<string, Map<string, { resultChar: string; id: string }>>,
  cellRootMap: Map<number, string>,
  rand: () => number,
): { success: boolean; roundRadicals: string[][] } {
  const roundRadicals: string[][] = [];
  let disabledKeys: string[] = [];

  for (const round of rounds) {
    const available = radicalPool.filter((r) => !disabledKeys.includes(r.key));
    const picks: string[] = [];

    for (let slot = 0; slot < PICKS_PER_ROUND; slot++) {
      const cellIndex = round[slot];
      const rootKey = cellRootMap.get(cellIndex);
      if (!rootKey) return { success: false, roundRadicals: [] };

      const validRadicals = available.filter((r) => comboMap.get(r.key)?.has(rootKey));
      if (validRadicals.length === 0) {
        return { success: false, roundRadicals: [] };
      }

      picks.push(validRadicals[Math.floor(rand() * validRadicals.length)].key);
    }

    roundRadicals.push(picks);
    disabledKeys = [...new Set(picks)];
  }

  return { success: true, roundRadicals };
}

function pickBestRadicalPool(
  candidateRadicals: PCBRadicalSeed[],
  radicalPoolSize: number,
  validCombos: Array<{ radicalKey: string; rootKey: string }>,
  difficultyKey: string,
  rand: () => number,
) {
  let best: PCBRadicalSeed[] = [];
  let bestScore = -1;

  const trials = 24;
  for (let t = 0; t < trials; t++) {
    const shuffled = [...candidateRadicals];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const picked = shuffled.slice(0, radicalPoolSize);
    const pickedKeys = new Set(picked.map((r) => r.key));
    const rootCount = new Map<string, number>();
    for (const combo of validCombos) {
      if (!pickedKeys.has(combo.radicalKey)) continue;
      rootCount.set(combo.rootKey, (rootCount.get(combo.rootKey) || 0) + 1);
    }

    const score = ROOT_DATA.reduce((acc, r) => {
      if ((rootCount.get(r.key) || 0) < 2) return acc;
      if (difficultyKey === 'easy') {
        return acc + (r.complexityLevel === 'LOW' || r.complexityLevel === 'MEDIUM' ? 1 : 0);
      }
      return acc + 1;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      best = picked;
    }
  }

  return best;
}

export function generatePCBPuzzle(
  seed: string,
  difficultyKey: string,
  radicalPoolSize: number,
): PCBGeneratedPuzzle | null {
  const rand = mulberry32(xmur3(seed)());

  const allowedDifficulties =
    difficultyKey === 'hard'
      ? ['easy', 'normal', 'hard']
      : difficultyKey === 'normal'
        ? ['easy', 'normal']
        : ['easy'];

  const validCombos = COMBO_DATA.filter(
    (c) => allowedDifficulties.includes(c.difficulty),
  );

  const comboMap = new Map<string, Map<string, { resultChar: string; id: string }>>();
  for (const c of validCombos) {
    if (!comboMap.has(c.radicalKey)) comboMap.set(c.radicalKey, new Map());
    comboMap.get(c.radicalKey)?.set(c.rootKey, { resultChar: c.resultChar, id: `${c.radicalKey}-${c.rootKey}` });
  }

  const candidateRadicals = RADICAL_DATA.filter((r) => {
    const rCombos = comboMap.get(r.key);
    return rCombos && rCombos.size >= 2;
  });
  if (candidateRadicals.length < radicalPoolSize) return null;

  const selectedRadicals = pickBestRadicalPool(
    candidateRadicals,
    radicalPoolSize,
    validCombos.map((c) => ({ radicalKey: c.radicalKey, rootKey: c.rootKey })),
    difficultyKey,
    rand,
  );
  if (selectedRadicals.length < radicalPoolSize) return null;

  const fullComboMap = new Map<string, Map<string, { resultChar: string; id: string }>>();
  for (const r of selectedRadicals) {
      const rCombos = new Map<string, { resultChar: string; id: string }>();
      for (const c of COMBO_DATA) {
      if (c.radicalKey === r.key && allowedDifficulties.includes(c.difficulty)) {
          rCombos.set(c.rootKey, { resultChar: c.resultChar, id: `${c.radicalKey}-${c.rootKey}` });
        }
      }
    if (rCombos.size > 0) fullComboMap.set(r.key, rCombos);
  }

  const rootComboCount = new Map<string, number>();
  for (const r of selectedRadicals) {
    const rCombos = fullComboMap.get(r.key);
    if (!rCombos) continue;
    for (const rootKey of rCombos.keys()) {
      rootComboCount.set(rootKey, (rootComboCount.get(rootKey) || 0) + 1);
    }
  }

  const validRoots = ROOT_DATA.filter((r) => {
    const count = rootComboCount.get(r.key) || 0;
    if (difficultyKey === 'easy') return count >= 2 && (r.complexityLevel === 'LOW' || r.complexityLevel === 'MEDIUM');
    if (difficultyKey === 'normal') return count >= 2;
    return count >= 2;
  });
  if (validRoots.length === 0) return null;

  const selectedRoots = pickRootsForBoard(validRoots, BOARD_SIZE * BOARD_SIZE, rand);
  const cells: PCBCell[] = selectedRoots.map((root, index) => ({
    index,
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
    rootKey: root.key,
    rootGlyph: root.glyph,
  }));

  const cellRootMap = new Map<number, string>();
  for (const cell of cells) cellRootMap.set(cell.index, cell.rootKey);

  const rounds = generateSerpentPath();
  const assignment = assignRadicalsToRounds(rounds, selectedRadicals, fullComboMap, cellRootMap, rand);
  if (!assignment.success) return null;

  const solutionRounds: PCBSolutionRound[] = rounds.map((path, roundIndex) => {
    const radicalKeys = assignment.roundRadicals[roundIndex];
    const resultChars = path.map((cellIndex, slot) => {
      const rootKey = cellRootMap.get(cellIndex);
      if (!rootKey) return '';
      return fullComboMap.get(radicalKeys[slot])?.get(rootKey)?.resultChar ?? '';
    });
    const combinationIds = path.map((cellIndex, slot) => {
      const rootKey = cellRootMap.get(cellIndex);
      if (!rootKey) return '';
      return fullComboMap.get(radicalKeys[slot])?.get(rootKey)?.id ?? '';
    });

    return { roundIndex, path, radicalKeys, resultChars, combinationIds };
  });

  if (solutionRounds.some((r) => r.resultChars.some((x) => !x) || r.combinationIds.some((x) => !x))) {
    return null;
  }

  return {
    radicalPool: selectedRadicals,
    cells,
    solutionRounds,
  };
}
