import type { MazeCoord, AbsoluteCommandDirection } from './types.js';
export declare function coordKey(coord: MazeCoord): string;
export declare function parseCoordKey(key: string): MazeCoord;
export declare function coordEquals(a: MazeCoord, b: MazeCoord): boolean;
export declare function directionToDelta(direction: AbsoluteCommandDirection): MazeCoord;
export declare function addCoord(a: MazeCoord, b: MazeCoord): MazeCoord;
export declare function isInBounds(coord: MazeCoord, size: {
    width: number;
    height: number;
    depth: number;
}): boolean;
export declare function cloneCoord(coord: MazeCoord): MazeCoord;
export declare function directionLabel(direction: AbsoluteCommandDirection): string;
export declare function directionShortLabel(direction: AbsoluteCommandDirection): string;
//# sourceMappingURL=coord.d.ts.map