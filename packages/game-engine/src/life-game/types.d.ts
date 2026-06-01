export interface CellCoord {
    x: number;
    y: number;
}
export interface LocalCellCoord {
    x: number;
    y: number;
}
export interface LifeBoundaryRule {
    wrapX: boolean;
    wrapY: boolean;
}
export interface LifeBoardState {
    width: number;
    height: number;
    aliveCells: CellCoord[];
}
export interface LifeRegion {
    id: number;
    label: string;
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
    width: number;
    height: number;
}
export interface LifeSimulationResult {
    status: 'STABLE' | 'OSCILLATING' | 'MAX_GENERATION_REACHED';
    finalState: LifeBoardState;
    stableState?: LifeBoardState;
    generations: number;
    period?: number;
}
export declare const LIFE_BOARD_WIDTH = 120;
export declare const LIFE_BOARD_HEIGHT = 15;
export declare const LIFE_REGION_COUNT = 12;
export declare const LIFE_REGION_WIDTH = 10;
export declare const LIFE_MAX_GENERATIONS = 100;
export declare const LIFE_MAX_ERROR_COUNT = 100;
export declare const DEFAULT_LIFE_BOUNDARY_RULE: LifeBoundaryRule;
//# sourceMappingURL=types.d.ts.map