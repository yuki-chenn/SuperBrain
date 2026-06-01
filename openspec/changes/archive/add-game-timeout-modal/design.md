## Context

Across `sliding-puzzle`, `life-game`, and `precise-character-building` we already have:

- A single source of truth for per-difficulty time budgets in `packages/shared/src/games/<game>/config.ts` (`maxDurationMs`).
- A backend dispatcher `getGameMaxDurationMs(slug, difficultyKey)` plus `isAttemptTimedOut`, used by every game's service for invalidate-on-touch and by the shared `attempt-timeout.ts`.
- Per-game `POST /games/:slug/attempts/:attemptId/timeout` endpoints that mark attempts `INVALID/TIMEOUT` without writing leaderboard entries.
- A frontend Zustand store per game whose `tick()` is invoked every 100 ms by a `setInterval` in the play page; on `elapsedMs >= maxDurationMs` it sets `status: 'timeout'` and calls `timeoutGame()` which posts to the timeout endpoint.

The defect is purely UX: the only modal on each play page is `GameResultModal`, gated on `result != null`. On the timeout path the store sets `result = null`, so nothing pops. There is also no during-play indicator of the remaining budget, so users are surprised when (silently) they hit the limit.

## Goals / Non-Goals

**Goals:**
- When `status === 'timeout'`, every play page surfaces a clear modal stating the time limit was reached and the attempt is not counted.
- During play, every page shows the remaining time prominently in the existing HUD area, with a visible warning state below 30 seconds.
- The new components are reusable across all three games (and any future game) without per-game branching.
- The single configuration entry point (per-game `config.ts`) remains unchanged and authoritative; documenting it explicitly in code/JSDoc.
- Zero changes to backend, Prisma, leaderboards, store internals, or API shapes.

**Non-Goals:**
- We are not adding "ignore timeout" cheats, server-side grace periods, or any change to invalid-reason handling.
- We are not making time durations runtime-configurable (still a code constant).
- We are not redesigning `GameResultModal` itself; the timeout case gets its own dedicated component.
- We are not introducing a global timeout middleware on the API. Service-level invalidation already exists; abstraction can land in a later refactor.
- No animation framework dependency. Plain Tailwind utilities.

## Decisions

### D1. Dedicated `GameTimeoutModal`, not a `variant` on `GameResultModal`

**Decision:** Add a new component `apps/web/src/components/game/GameTimeoutModal.tsx`.

**Why:**
- `GameResultModal` is heavily structured around success metrics (`durationMs`, `moves`, leaderboard CTA, personal-best badge). A timeout has none of these, plus an explicit "not counted" disclaimer. Forcing a variant produces conditional spaghetti.
- Keeping them separate makes the failure path testable and visually distinct (red-tinted accent vs neutral) without coupling.

**Alternative considered:** `<GameResultModal variant="timeout" />`. Rejected — the prop union explodes (`metrics` becomes optional; CTAs flip; subheading flips) and we'd duplicate styling logic anyway.

### D2. Drive modal visibility purely from `status === 'timeout'`

**Decision:** The play page renders `<GameTimeoutModal open={status === 'timeout'} ... />`. No new state is added to any store.

**Why:**
- The three stores already converge on `status: 'timeout'` from two different code paths (client tick and server-detected timeout-on-finish). Reading that single value covers both.
- Avoids adding `showTimeoutModal` flags that can drift out of sync with the underlying state machine.

**Close behavior:** modal close calls the existing `reset()` action (or in PCB's case `reset` + navigate) — same UX as `GameResultModal`.

### D3. `GameCountdown` HUD component reads `maxDurationMs` + `elapsedMs`

**Decision:** New `apps/web/src/components/game/GameCountdown.tsx`. Props: `{ elapsedMs: number; maxDurationMs: number }`. Renders `mm:ss` of `remaining = max(0, maxDurationMs - elapsedMs)` and a thin progress bar. Below 30 seconds the text and bar use the existing destructive accent (red).

**Why:**
- Both fields already live on every game store and are already wired via `useStore((s) => s.elapsedMs)` selectors.
- Pushing it into a small dumb component means: (a) future games drop it in; (b) we don't fork three identical countdown calculators.

**Insertion point:** the existing `GameHud` already has metric pills (moves, errors, etc.). Add `<GameCountdown ... />` either as a `MetricPill` variant or as its own slot. Prefer reusing the `MetricPill` look (consistent visual rhythm), with a "warning" prop that paints it red.

### D4. Trust the store's existing tick cadence (100 ms)

**Decision:** Reuse the existing `setInterval(tick, 100)` in each play page. Do not add a second timer.

**Why:**
- 100 ms is already the resolution of the elapsed display. It's enough for `mm:ss` countdown and for triggering `timeoutGame()` within an unobservable margin.
- Adding a second `useEffect`/`setInterval` would cause double scheduling and complicate cleanup.

### D5. "Not counted" wording is part of the timeout contract

**Decision:** The modal explicitly states "本次挑战不计入成绩" (or equivalent) and disables any "view leaderboard" CTA.

**Why:**
- The actual behavior on the API is exactly this (`recordAttemptResult` is not called for `INVALID` attempts). Tying the UI promise to the implementation fact prevents drift; the spec scenarios will assert this.

### D6. Single source of timeout config, documented inline

**Decision:** Add a JSDoc block at the top of each `packages/shared/src/games/<game>/config.ts` calling out: "Single source of truth for timeout duration. The same value is consumed by API (`getGameMaxDurationMs`) and Web (`startAttempt` response → store `maxDurationMs`)." No constant moves.

**Why:**
- Cheap, durable docstring that points future authors at the right file.

## Risks / Trade-offs

- **[Risk]** Two close-actions (`reset` and `back to games`) on the timeout modal. Picking the wrong default could surprise users.
  → **Mitigation:** Make `Restart` the primary (focus-trap default) — same shape as `GameResultModal`'s primary CTA — and `Back to games` secondary.
- **[Risk]** A player could perceive the countdown as "I have to play fast" on easier difficulties even when the budget is generous.
  → **Mitigation:** Only highlight (red) below 30s. Otherwise it reads as a neutral metric pill.
- **[Risk]** Server time and client time can drift; the client's countdown could show 0:01 left while the server has already invalidated.
  → **Mitigation:** The store's `tick()` already calls `/timeout` endpoint when the *client* hits zero, and any subsequent submit call will be rejected with `INVALID/TIMEOUT` by the server, which the store maps to `status: 'timeout'`. Both paths converge on the same modal, so drift is harmless.
- **[Trade-off]** We do not refactor the three near-identical timeout branches in services into a Nest interceptor or guard. Rationale: that's a larger refactor and orthogonal to fixing the visible UX bug. Captured as future work in `attempts` capability if/when needed.
- **[Risk]** `status === 'timeout'` could in theory be reached without `attemptId` if the start request itself fails. The modal would show.
  → **Mitigation:** Render condition guards on `attemptId` being present, or accept that this is unreachable in practice (timeout is only ever reached after a successful `start`).

## Migration Plan

- **Deploy:** standard frontend deploy. No backend redeploy. No data migration.
- **Rollback:** revert the three play page changes; the new components are additive and harmless.
- **Verification:**
  1. In dev, lower one difficulty's `maxDurationMs` to e.g. 15 s in `packages/shared/src/games/sliding-puzzle/config.ts`, rebuild shared, start an attempt, do not finish — modal must appear at 0:00.
  2. Restart, finish quickly within budget — modal must NOT appear, `GameResultModal` must appear.
  3. Restart, abandon mid-play — neither modal appears (status `abandoned` is unaffected).
  4. Network tab shows `POST /games/:slug/attempts/:id/timeout` returns `200 { status: 'INVALID', reason: 'TIMEOUT' }`.
  5. Leaderboard for that difficulty does not gain a row from the timed-out attempt.

## Open Questions

- Should the countdown be hidden during the 5-second pre-game countdown (currently `status === 'countdown'`)? Current proposal: yes, only show during `status === 'playing'`. Confirm during implementation.
- Should the timeout modal include the rank-relevant metric snapshot ("you reached round X / lit Y cells")? Lean towards minimal — the goal is "you ran out of time," not autopsy. Open for product preference.
