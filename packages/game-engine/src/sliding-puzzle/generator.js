import { createSolvedBoard, getBlankIndex, moveTile } from './engine.js';
// xmur3 hash: string -> () => number
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
// mulberry32 PRNG: seed number -> () => number (0 to 1)
function mulberry32(a) {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function generateSlidingPuzzleInitialState(input) {
    const { size, seed, scrambleMoves } = input;
    const board = createSolvedBoard(size);
    let state = { size, board };
    const rand = mulberry32(xmur3(seed)());
    let lastMovedTile = null;
    for (let i = 0; i < scrambleMoves; i++) {
        const blankIdx = getBlankIndex(state.board);
        const row = Math.floor(blankIdx / size);
        const col = blankIdx % size;
        // Find all adjacent tile values
        const adjacentTiles = [];
        if (row > 0)
            adjacentTiles.push(state.board[blankIdx - size]); // up
        if (row < size - 1)
            adjacentTiles.push(state.board[blankIdx + size]); // down
        if (col > 0)
            adjacentTiles.push(state.board[blankIdx - 1]); // left
        if (col < size - 1)
            adjacentTiles.push(state.board[blankIdx + 1]); // right
        // Filter out last moved tile to avoid immediate undo
        let candidates = adjacentTiles.filter((t) => t !== lastMovedTile);
        if (candidates.length === 0) {
            candidates = adjacentTiles;
        }
        const chosen = candidates[Math.floor(rand() * candidates.length)];
        lastMovedTile = chosen;
        state = moveTile(state, chosen);
    }
    // If still solved, do extra scrambles
    if (state.board.every((v, i) => (i < size * size - 1 ? v === i + 1 : v === 0))) {
        for (let i = 0; i < 10; i++) {
            const blankIdx = getBlankIndex(state.board);
            const row = Math.floor(blankIdx / size);
            const col = blankIdx % size;
            const adjacentTiles = [];
            if (row > 0)
                adjacentTiles.push(state.board[blankIdx - size]);
            if (row < size - 1)
                adjacentTiles.push(state.board[blankIdx + size]);
            if (col > 0)
                adjacentTiles.push(state.board[blankIdx - 1]);
            if (col < size - 1)
                adjacentTiles.push(state.board[blankIdx + 1]);
            const chosen = adjacentTiles[Math.floor(rand() * adjacentTiles.length)];
            state = moveTile(state, chosen);
        }
    }
    return state;
}
//# sourceMappingURL=generator.js.map