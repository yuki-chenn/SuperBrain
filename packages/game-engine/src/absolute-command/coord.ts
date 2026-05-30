import type { MazeCoord, AbsoluteCommandDirection } from './types.js';

export function coordKey(coord: MazeCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

export function parseCoordKey(key: string): MazeCoord {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z };
}

export function coordEquals(a: MazeCoord, b: MazeCoord): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function directionToDelta(direction: AbsoluteCommandDirection): MazeCoord {
  switch (direction) {
    case 'X_POS': return { x: 1, y: 0, z: 0 };
    case 'X_NEG': return { x: -1, y: 0, z: 0 };
    case 'Y_POS': return { x: 0, y: 1, z: 0 };
    case 'Y_NEG': return { x: 0, y: -1, z: 0 };
    case 'Z_POS': return { x: 0, y: 0, z: 1 };
    case 'Z_NEG': return { x: 0, y: 0, z: -1 };
  }
}

export function addCoord(a: MazeCoord, b: MazeCoord): MazeCoord {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function isInBounds(
  coord: MazeCoord,
  size: { width: number; height: number; depth: number },
): boolean {
  return (
    coord.x >= 0 && coord.x < size.width &&
    coord.y >= 0 && coord.y < size.height &&
    coord.z >= 0 && coord.z < size.depth
  );
}

export function cloneCoord(coord: MazeCoord): MazeCoord {
  return { x: coord.x, y: coord.y, z: coord.z };
}

export function directionLabel(direction: AbsoluteCommandDirection): string {
  switch (direction) {
    case 'X_POS': return '右 X+';
    case 'X_NEG': return '左 X-';
    case 'Y_POS': return '后 Y+';
    case 'Y_NEG': return '前 Y-';
    case 'Z_POS': return '上 Z+';
    case 'Z_NEG': return '下 Z-';
  }
}

export function directionShortLabel(direction: AbsoluteCommandDirection): string {
  switch (direction) {
    case 'X_POS': return 'X+';
    case 'X_NEG': return 'X-';
    case 'Y_POS': return 'Y+';
    case 'Y_NEG': return 'Y-';
    case 'Z_POS': return 'Z+';
    case 'Z_NEG': return 'Z-';
  }
}
