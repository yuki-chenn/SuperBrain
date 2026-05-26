export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function formatRank(rank: number): string {
  return `#${rank}`;
}

/**
 * Format a millisecond duration as Chinese "x时 y分 z秒".
 *
 * Zero-valued segments are omitted, e.g.:
 *   3_600_000 → "1时"
 *   3_661_000 → "1时1分1秒"
 *   59_000    → "59秒"
 *   0         → "0秒"
 *   negative  → "0秒"
 *
 * Sub-second precision is dropped (floored to integer seconds).
 * Use this for in-game elapsed/remaining displays where the user wants a
 * human-readable time budget rather than a precise stopwatch value.
 */
export function formatChineseDuration(ms: number): string {
  const totalSeconds =
    Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}时`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (seconds > 0) parts.push(`${seconds}秒`);

  return parts.length > 0 ? parts.join('') : '0秒';
}

/**
 * Format a remaining duration in `mm:ss` (clamped to `00:00`).
 *
 * Kept for places that intentionally want a stopwatch-style display.
 * For new in-game UI, prefer {@link formatChineseDuration}.
 */
export function formatRemaining(ms: number): string {
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
