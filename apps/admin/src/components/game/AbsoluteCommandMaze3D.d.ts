import type { AbsoluteCommandCell, MazeCoord, AbsoluteCommandRuntimeState } from '@brain-games/game-engine';
interface Maze3DProps {
    cells: AbsoluteCommandCell[];
    size: {
        width: number;
        height: number;
        depth: number;
    };
    state: AbsoluteCommandRuntimeState;
    animatingCoord?: MazeCoord | null;
}
export declare function AbsoluteCommandMaze3D(props: Maze3DProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AbsoluteCommandMaze3D.d.ts.map