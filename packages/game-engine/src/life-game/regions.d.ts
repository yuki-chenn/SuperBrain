import type { CellCoord, LocalCellCoord, LifeRegion, LifeBoardState } from './types.js';
export declare function getLifeRegions(): LifeRegion[];
export declare function getRegionById(regionId: number): LifeRegion;
export declare function getRegionIdByCell(x: number, y: number): number;
export declare function extractRegionAnswer(stableState: LifeBoardState, regionId: number): LocalCellCoord[];
export declare function toLocalCoord(cell: CellCoord, region: LifeRegion): LocalCellCoord;
export declare function toGlobalCoord(cell: LocalCellCoord, region: LifeRegion): CellCoord;
//# sourceMappingURL=regions.d.ts.map