import { describe, expect, it } from 'vitest';
import {
  indexToCoord,
  coordToIndex,
  isAdjacent8,
  isAdjacent4,
  validateRoundPath,
  validateRound,
  updateStateAfterSuccess,
  getAvailableRadicals,
  isRadicalAvailable,
} from '../index.js';

describe('precise-character-building engine', () => {
  it('converts index and coord correctly', () => {
    expect(indexToCoord(0)).toEqual({ row: 0, col: 0 });
    expect(indexToCoord(35)).toEqual({ row: 5, col: 5 });
    expect(coordToIndex(2, 3)).toBe(15);
  });

  it('checks adjacency in 8 and 4 directions', () => {
    expect(isAdjacent8({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(true);
    expect(isAdjacent4({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(false);
    expect(isAdjacent4({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
  });

  it('allows any first cell on first round', () => {
    const result = validateRoundPath({
      currentPosition: null,
      selectedCellIndices: [0, 1, 2, 3],
      litCellIndices: new Set<number>(),
      adjacencyMode: 'KING_8',
    });
    expect(result.valid).toBe(true);
  });

  it('requires first cell adjacent when current position exists', () => {
    const result = validateRoundPath({
      currentPosition: { row: 0, col: 0 },
      selectedCellIndices: [8, 9, 10, 11],
      litCellIndices: new Set<number>(),
      adjacencyMode: 'KING_8',
    });
    expect(result).toEqual({ valid: false, reason: 'FIRST_CELL_NOT_ADJACENT' });
  });

  it('rejects duplicated and lit cells', () => {
    expect(
      validateRoundPath({
        currentPosition: null,
        selectedCellIndices: [0, 0, 1, 2],
        litCellIndices: new Set<number>(),
        adjacencyMode: 'KING_8',
      }),
    ).toEqual({ valid: false, reason: 'DUPLICATED_CELL_IN_ROUND' });

    expect(
      validateRoundPath({
        currentPosition: null,
        selectedCellIndices: [0, 1, 2, 3],
        litCellIndices: new Set<number>([2]),
        adjacencyMode: 'KING_8',
      }),
    ).toEqual({ valid: false, reason: 'CELL_ALREADY_LIT' });
  });

  it('validates round combinations and difficulty gating', () => {
    const valid = validateRound({
      selectedRadicalKeys: ['water', 'heart', 'water', 'heart'],
      selectedCells: [
        { index: 0, row: 0, col: 0, rootKey: 'qing', rootGlyph: '青' },
        { index: 1, row: 0, col: 1, rootKey: 'qing', rootGlyph: '青' },
        { index: 2, row: 0, col: 2, rootKey: 'ma', rootGlyph: '马' },
        { index: 3, row: 0, col: 3, rootKey: 'ma', rootGlyph: '马' },
      ],
      difficultyKey: 'easy',
      combinations: [
        {
          radicalKey: 'water',
          rootKey: 'qing',
          resultChar: '清',
          structure: 'LEFT_RIGHT',
          difficulty: 'easy',
        },
        {
          radicalKey: 'heart',
          rootKey: 'qing',
          resultChar: '情',
          structure: 'LEFT_RIGHT',
          difficulty: 'easy',
        },
        {
          radicalKey: 'water',
          rootKey: 'ma',
          resultChar: '吗',
          structure: 'LEFT_RIGHT',
          difficulty: 'easy',
        },
        {
          radicalKey: 'heart',
          rootKey: 'ma',
          resultChar: '码',
          structure: 'LEFT_RIGHT',
          difficulty: 'easy',
        },
      ],
    });
    expect(valid.valid).toBe(true);
    expect(valid.resultChars).toEqual(['清', '情', '吗', '码']);

    const invalid = validateRound({
      selectedRadicalKeys: ['water', 'water', 'water', 'water'],
      selectedCells: [
        { index: 0, row: 0, col: 0, rootKey: 'qing', rootGlyph: '青' },
        { index: 1, row: 0, col: 1, rootKey: 'qing', rootGlyph: '青' },
        { index: 2, row: 0, col: 2, rootKey: 'qing', rootGlyph: '青' },
        { index: 3, row: 0, col: 3, rootKey: 'qing', rootGlyph: '青' },
      ],
      difficultyKey: 'normal',
      combinations: [
        {
          radicalKey: 'water',
          rootKey: 'qing',
          resultChar: '清',
          structure: 'LEFT_RIGHT',
          difficulty: 'hard',
        },
      ],
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errorReason).toBe('INVALID_COMBINATION');
    expect(invalid.invalidSlotIndex).toBe(0);
  });

  it('updates state and radical availability after success', () => {
    const next = updateStateAfterSuccess(
      {
        currentRoundIndex: 0,
        currentPosition: null,
        litCellIndices: [],
        disabledRadicalKeys: [],
        errorCount: 1,
      },
      [0, 1, 2, 3],
      ['water', 'water', 'heart', 'heart'],
    );

    expect(next.currentRoundIndex).toBe(1);
    expect(next.currentPosition).toEqual({ row: 0, col: 3 });
    expect(next.litCellIndices).toEqual([0, 1, 2, 3]);
    expect(next.disabledRadicalKeys).toEqual(['water', 'heart']);

    const radicals = [
      { key: 'water', glyph: '氵', label: '水', category: 'LEFT' },
      { key: 'heart', glyph: '忄', label: '心', category: 'LEFT' },
      { key: 'wood', glyph: '木', label: '木', category: 'LEFT' },
    ];
    expect(getAvailableRadicals(radicals, next.disabledRadicalKeys)).toEqual([
      { key: 'wood', glyph: '木', label: '木', category: 'LEFT' },
    ]);
    expect(isRadicalAvailable('wood', next.disabledRadicalKeys)).toBe(true);
    expect(isRadicalAvailable('water', next.disabledRadicalKeys)).toBe(false);
  });
});
