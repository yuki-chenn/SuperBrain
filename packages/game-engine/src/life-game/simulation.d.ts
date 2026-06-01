import type { LifeBoardState, LifeBoundaryRule, LifeSimulationResult } from './types.js';
export interface SimulateUntilStableInput {
    initialState: LifeBoardState;
    boundary: LifeBoundaryRule;
    maxGenerations?: number;
}
export declare function simulateUntilStable(input: SimulateUntilStableInput): LifeSimulationResult;
//# sourceMappingURL=simulation.d.ts.map