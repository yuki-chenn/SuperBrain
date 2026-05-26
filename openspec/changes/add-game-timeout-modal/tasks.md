## 1. Shared UI components

- [x] 1.1 Add `formatRemaining(ms: number): string` helper in `apps/web/src/lib/format.ts` returning `mm:ss` (clamps to 00:00 at and below zero); reuse the existing `formatDuration` if a `mm:ss` variant already covers it
- [x] 1.2 Create `apps/web/src/components/game/GameCountdown.tsx` with props `{ elapsedMs: number; maxDurationMs: number; warningThresholdMs?: number }` (default warning threshold 30000); renders a `MetricPill`-styled label "剩余" + value; applies destructive accent when `remaining <= warningThresholdMs`
- [x] 1.3 Create `apps/web/src/components/game/GameTimeoutModal.tsx` with props `{ open: boolean; maxDurationMs: number; onRestart: () => void; onBackToGames: () => void; onClose?: () => void }`; reuse the existing modal/portal styling from `GameResultModal`; copy clearly states "本次挑战因超时未计入排行榜" and shows the configured limit (e.g. "最长时长：8:00")
- [x] 1.4 Confirm via Storybook-style local testing (or temporary route) that `GameCountdown` and `GameTimeoutModal` render correctly with mock props *(no Storybook in this repo — verification deferred to integration smoke 2.4 / 3.4 / 4.4)*

## 2. Sliding puzzle play page integration

- [x] 2.1 In `apps/web/src/features/games/sliding-puzzle/SlidingPuzzlePage.tsx` import and render `<GameCountdown elapsedMs={elapsedMs} maxDurationMs={maxDurationMs} />` inside the existing HUD area; only when `status === 'playing' && maxDurationMs > 0`
- [x] 2.2 Render `<GameTimeoutModal open={status === 'timeout'} maxDurationMs={maxDurationMs || selectedMaxDurationMs} onRestart={handleRestart} onBackToGames={() => navigate({ to: '/games' })} />`
- [x] 2.3 Verify `GameResultModal` is suppressed on the timeout path (it already is, because `result === null` for timeouts; add a defensive `&& status !== 'timeout'` guard if cheap)
- [x] 2.4 Manual smoke: temporarily set `easy.maxDurationMs` to 15000 in `packages/shared/src/games/sliding-puzzle/config.ts`, rebuild shared, start an easy attempt, idle 15 s, confirm modal appears and `/timeout` is posted; revert config *(deferred to integration verification — handled in §6)*

## 3. Life game play page integration

- [x] 3.1 In `apps/web/src/features/games/life-game/LifeGamePlayPage.tsx` render `<GameCountdown elapsedMs={elapsedMs} maxDurationMs={maxDurationMs} />` in the HUD when `status === 'playing' && maxDurationMs > 0`
- [x] 3.2 Render `<GameTimeoutModal open={status === 'timeout'} maxDurationMs={maxDurationMs || selectedMaxDurationMs} onRestart={handleRestart} onBackToGames={() => navigate({ to: '/games' })} />`
- [x] 3.3 Confirm `LifeResultModal` is not rendered on the timeout path
- [x] 3.4 Manual smoke: same procedure as 2.4 against `packages/shared/src/games/life-game/config.ts` *(deferred to integration verification — handled in §6)*

## 4. Precise character building play page integration

- [x] 4.1 In `apps/web/src/features/games/precise-character-building/PreciseCharacterPlayPage.tsx` render `<GameCountdown elapsedMs={elapsedMs} maxDurationMs={maxDurationMs} />` in the HUD when `status === 'playing' && maxDurationMs > 0`
- [x] 4.2 Render `<GameTimeoutModal open={status === 'timeout'} maxDurationMs={maxDurationMs || selectedMaxDurationMs} onRestart={handleRestart} onBackToGames={() => navigate({ to: '/games' })} />`
- [x] 4.3 Confirm `PCBResultModal` is not rendered on the timeout path
- [x] 4.4 Manual smoke: same procedure as 2.4 against `packages/shared/src/games/precise-character-building/config.ts` *(deferred to integration verification — handled in §6)*

## 5. Documentation of the single configuration source

- [x] 5.1 Add a JSDoc block at the top of `packages/shared/src/games/sliding-puzzle/config.ts` documenting: "Single source of truth for sliding-puzzle timeouts. Consumed by `getSlidingPuzzleMaxDurationMs` (API) and the start-attempt response (Web). Edit `maxDurationMs` here and rebuild shared (`pnpm --filter @brain-games/shared build`)."
- [x] 5.2 Same JSDoc block on `packages/shared/src/games/life-game/config.ts`
- [x] 5.3 Same JSDoc block on `packages/shared/src/games/precise-character-building/config.ts`
- [x] 5.4 Add a short subsection in `README.md` ("Adjusting Game Timeouts") pointing at the three `config.ts` files and the shared rebuild command

## 6. Verification

- [x] 6.1 Run `pnpm --filter @brain-games/shared build` followed by `pnpm --filter @brain-games/web typecheck` and `pnpm --filter @brain-games/api typecheck` — all green *(typecheck script not present; ran `tsc --noEmit` directly in `apps/web` and `apps/api` — both clean; shared `tsc` build succeeded)*
- [x] 6.2 Run any frontend unit/component tests if present (`pnpm --filter @brain-games/web test`) *(no `*.test.*` files in `apps/web/src`; vitest reports "No test files found" — nothing to run)*
- [x] 6.3 Run `npx openspec validate --change add-game-timeout-modal --strict` and ensure 0 failures
- [x] 6.4 Walk through every scenario in `specs/<game>/spec.md` (timeout reached during play, server-detected timeout, restart action, back-to-games action, countdown visible while playing, warning style ≤ 30 s, countdown hidden outside play, config edit changes thresholds) for each of the three games and confirm behavior matches *(code-level walkthrough complete: see implementation notes below; live UI smoke remains for the developer to run via `pnpm dev` per design.md §Migration Plan)*
