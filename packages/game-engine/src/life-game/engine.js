export function cellKey(x, y) {
    return `${x},${y}`;
}
export function boardToAliveSet(state) {
    const set = new Set();
    for (const cell of state.aliveCells) {
        set.add(cellKey(cell.x, cell.y));
    }
    return set;
}
export function countAliveNeighbors(state, x, y, boundary) {
    const aliveSet = boardToAliveSet(state);
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0)
                continue;
            let nx = x + dx;
            let ny = y + dy;
            if (boundary.wrapX) {
                nx = ((nx % state.width) + state.width) % state.width;
            }
            else if (nx < 0 || nx >= state.width) {
                continue;
            }
            if (boundary.wrapY) {
                ny = ((ny % state.height) + state.height) % state.height;
            }
            else if (ny < 0 || ny >= state.height) {
                continue;
            }
            if (aliveSet.has(cellKey(nx, ny))) {
                count++;
            }
        }
    }
    return count;
}
export function stepLife(state, boundary) {
    const aliveSet = boardToAliveSet(state);
    const nextAlive = [];
    // Check all cells that could change: alive cells and their neighbors
    const candidates = new Set();
    for (const cell of state.aliveCells) {
        candidates.add(cellKey(cell.x, cell.y));
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                let nx = cell.x + dx;
                let ny = cell.y + dy;
                if (boundary.wrapX) {
                    nx = ((nx % state.width) + state.width) % state.width;
                }
                else if (nx < 0 || nx >= state.width) {
                    continue;
                }
                if (boundary.wrapY) {
                    ny = ((ny % state.height) + state.height) % state.height;
                }
                else if (ny < 0 || ny >= state.height) {
                    continue;
                }
                candidates.add(cellKey(nx, ny));
            }
        }
    }
    for (const key of candidates) {
        const [xStr, yStr] = key.split(',');
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);
        const isAlive = aliveSet.has(key);
        const neighbors = countAliveNeighbors(state, x, y, boundary);
        // B3/S23 rules
        if (isAlive) {
            if (neighbors === 2 || neighbors === 3) {
                nextAlive.push({ x, y });
            }
        }
        else {
            if (neighbors === 3) {
                nextAlive.push({ x, y });
            }
        }
    }
    return {
        width: state.width,
        height: state.height,
        aliveCells: nextAlive,
    };
}
export function normalizeBoard(state) {
    return {
        ...state,
        aliveCells: [...state.aliveCells].sort((a, b) => {
            if (a.x !== b.x)
                return a.x - b.x;
            return a.y - b.y;
        }),
    };
}
export function isSameBoard(a, b) {
    if (a.aliveCells.length !== b.aliveCells.length)
        return false;
    const na = normalizeBoard(a);
    const nb = normalizeBoard(b);
    for (let i = 0; i < na.aliveCells.length; i++) {
        if (na.aliveCells[i].x !== nb.aliveCells[i].x || na.aliveCells[i].y !== nb.aliveCells[i].y) {
            return false;
        }
    }
    return true;
}
export function boardHash(state) {
    const normalized = normalizeBoard(state);
    return normalized.aliveCells.map((c) => `${c.x},${c.y}`).join(';');
}
//# sourceMappingURL=engine.js.map