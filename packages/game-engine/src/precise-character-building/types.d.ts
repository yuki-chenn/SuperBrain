export type AdjacencyMode = 'KING_8' | 'ORTHOGONAL_4';
export type CharacterStructure = 'LEFT_RIGHT' | 'TOP_BOTTOM' | 'SURROUND' | 'SEMI_SURROUND';
export interface CharacterCell {
    index: number;
    row: number;
    col: number;
    rootKey: string;
    rootGlyph: string;
}
export interface Radical {
    key: string;
    glyph: string;
    label: string;
    category: string;
}
export interface CharacterCombinationEntry {
    radicalKey: string;
    rootKey: string;
    resultChar: string;
    structure: CharacterStructure;
    difficulty: string;
}
export interface SolutionRound {
    roundIndex: number;
    path: number[];
    radicalKeys: string[];
    resultChars: string[];
    combinationIds: string[];
}
export interface PuzzleConfig {
    picksPerRound: number;
    adjacencyMode: AdjacencyMode;
    cooldownRounds: number;
    allowRadicalRepeatInRound: boolean;
}
export interface PreciseCharacterPuzzleData {
    boardSize: number;
    radicalPool: Radical[];
    cells: CharacterCell[];
    solutionRounds: SolutionRound[];
    config: PuzzleConfig;
}
export interface Coord {
    row: number;
    col: number;
}
export interface RoundSubmissionState {
    currentRoundIndex: number;
    currentPosition: Coord | null;
    litCellIndices: number[];
    disabledRadicalKeys: string[];
    errorCount: number;
}
export interface ValidateRoundPathInput {
    currentPosition: Coord | null;
    selectedCellIndices: number[];
    litCellIndices: Set<number>;
    adjacencyMode: AdjacencyMode;
}
export interface ValidateRoundPathResult {
    valid: boolean;
    reason?: 'INVALID_PATH_LENGTH' | 'CELL_OUT_OF_RANGE' | 'DUPLICATED_CELL_IN_ROUND' | 'CELL_ALREADY_LIT' | 'FIRST_CELL_NOT_ADJACENT' | 'PATH_BROKEN';
}
export declare const BOARD_SIZE = 6;
export declare const CELLS_TO_LIGHT = 36;
export declare const PICKS_PER_ROUND = 4;
export declare const COOLDOWN_ROUNDS = 1;
export declare const PCB_MAX_ERROR_COUNT = 100;
//# sourceMappingURL=types.d.ts.map