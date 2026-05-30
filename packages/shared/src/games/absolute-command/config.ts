export const AC_MAX_DURATION_MS = 60 * 60 * 1000; // 60 minutes per attempt

export function getAbsoluteCommandMaxDurationMs(_difficultyKey?: string): number {
  return AC_MAX_DURATION_MS;
}

export const AC_DIFFICULTY_LABELS = ['入门', '标准', '困难', '专家'] as const;
export type ACDifficultyLabel = (typeof AC_DIFFICULTY_LABELS)[number];
