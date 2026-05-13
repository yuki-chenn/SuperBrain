export interface GameDimension {
  key: string;
  label: string;
  value: number;
}

// 观察、记忆、空间、创造、推理、计算 — each 1-5
export const GAME_DIMENSIONS: Record<string, GameDimension[]> = {
  'sliding-puzzle': [
    { key: 'observe', label: '观察', value: 2 },
    { key: 'memory', label: '记忆', value: 2 },
    { key: 'spatial', label: '空间', value: 1 },
    { key: 'creative', label: '创造', value: 3 },
    { key: 'reasoning', label: '推理', value: 3 },
    { key: 'calculation', label: '计算', value: 3 },
  ],
  'life-game': [
    { key: 'observe', label: '观察', value: 3 },
    { key: 'memory', label: '记忆', value: 3 },
    { key: 'spatial', label: '空间', value: 1 },
    { key: 'creative', label: '创造', value: 2 },
    { key: 'reasoning', label: '推理', value: 5 },
    { key: 'calculation', label: '计算', value: 3 },
  ],
};
