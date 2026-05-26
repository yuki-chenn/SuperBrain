# Add Game Timeout Modal & HUD Countdown

## Why

The end-to-end timeout machinery (per-difficulty `maxDurationMs` config, server invalidate-on-touch, `/timeout` endpoint, client `tick()` polling) is already wired across all three games. The single gap: when the timer hits zero the existing `GameResultModal` is gated on `result != null`, so the user sees no completion modal and no immediate prompt — just a small "已超时" line on a side panel they aren't looking at. From the player's seat the game appears to "go silent" forever.

We also lack any during-play indicator of the time budget, so players have no warning a timeout is approaching.

This change closes the visibility gap without touching configuration, server logic, or the timing protocol.

## What Changes

- Add a single, reusable `GameTimeoutModal` component that any game's play page can render when `status === 'timeout'`. The modal explains the limit was reached, that the attempt is **not counted on the leaderboard**, and offers `Restart` / `Back to games` actions.
- Wire the three play pages (`SlidingPuzzlePage`, `LifeGamePlayPage`, `PreciseCharacterPlayPage`) to render `GameTimeoutModal` whenever their store reaches the timeout terminal state. No store/API changes required.
- Add a `GameCountdown` HUD component that shows remaining time `mm:ss` (with a thin progress bar), driven by the existing `elapsedMs` + `maxDurationMs` already on every store. Render it inside the existing `GameHud` slot on each play page when `maxDurationMs > 0` and the attempt is `playing`. Visual warning state when `remaining ≤ 30s`.
- No changes to backend, no changes to `packages/shared/src/games/*/config.ts`. Document (in design.md and inline JSDoc) that those config files remain the single source of truth for timeout duration.

## Capabilities

### New Capabilities
*(none — this is purely a frontend rendering gap)*

### Modified Capabilities
- `sliding-puzzle`: behavior unchanged on the API; add a UX requirement that the play page surfaces a timeout modal and a remaining-time HUD.
- `life-game`: same — add UX requirement for timeout modal and HUD.
- `precise-character-building`: same — add UX requirement for timeout modal and HUD.

## Impact

- **Frontend (touched)**:
  - New: `apps/web/src/components/game/GameTimeoutModal.tsx`
  - New: `apps/web/src/components/game/GameCountdown.tsx`
  - Modified: `apps/web/src/features/games/sliding-puzzle/SlidingPuzzlePage.tsx`
  - Modified: `apps/web/src/features/games/life-game/LifeGamePlayPage.tsx`
  - Modified: `apps/web/src/features/games/precise-character-building/PreciseCharacterPlayPage.tsx`
  - Possibly minor: `apps/web/src/components/game/GameHud.tsx` (slot for countdown) and `apps/web/src/lib/format.ts` (shared `formatRemaining(ms)` helper if one is missing)
- **Backend (untouched)**: `apps/api/**`, Prisma schema, migrations, leaderboards.
- **Shared (untouched)**: `packages/shared/src/games/<game>/config.ts` remain the only place to change durations. `packages/game-engine/**` untouched.
- **APIs (untouched)**: `/games/:slug/attempts/start`, `/start-playing`, `/timeout`, life-game region submit, PCB round submit. The frontend already consumes `maxDurationMs` from the start response; no contract changes.
- **Dependencies**: none added.
- **Risk**: low. Fallback if the modal fails to render is the existing (silent) behavior, which is what users have today.
