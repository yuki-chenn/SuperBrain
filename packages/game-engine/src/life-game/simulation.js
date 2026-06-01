import { LIFE_MAX_GENERATIONS } from './types.js';
import { stepLife, isSameBoard, boardHash } from './engine.js';
export function simulateUntilStable(input) {
    const { initialState, boundary, maxGenerations = LIFE_MAX_GENERATIONS } = input;
    let current = initialState;
    const seenStates = new Map();
    seenStates.set(boardHash(initialState), 0);
    for (let gen = 1; gen <= maxGenerations; gen++) {
        const next = stepLife(current, boundary);
        // Check fixed point: next === current
        if (isSameBoard(next, current)) {
            return {
                status: 'STABLE',
                finalState: next,
                stableState: next,
                generations: gen,
            };
        }
        // Check oscillation: have we seen this state before?
        const hash = boardHash(next);
        const prevGen = seenStates.get(hash);
        if (prevGen !== undefined) {
            return {
                status: 'OSCILLATING',
                finalState: next,
                generations: gen,
                period: gen - prevGen,
            };
        }
        seenStates.set(hash, gen);
        current = next;
    }
    return {
        status: 'MAX_GENERATION_REACHED',
        finalState: current,
        generations: maxGenerations,
    };
}
//# sourceMappingURL=simulation.js.map