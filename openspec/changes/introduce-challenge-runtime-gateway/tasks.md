# Tasks — introduce-challenge-runtime-gateway

## 1. Preparation

- [x] 1.1 Remove `src/games` and `src/attempts` from `apps/api/tsconfig.json` `exclude`.
- [x] 1.2 Inventory of legacy `src/games/**` and `src/attempts/**` files that must be rewritten vs deleted; capture in commit message.
- [x] 1.3 Confirm Change 2 is merged: `pnpm api -- pnpm build` succeeds on the auth/users/admin/common subset.

## 2. Shared schemas

- [x] 2.1 Rewrite `packages/shared/src/schemas/attempts.ts` into challenge-shape: `StartChallengeRequest/Response`, `ClaimChallengeRequest/Response`, `ChallengeHeartbeatRequest/Response`, `AbandonChallengeRequest/Response`, `FinishChallengeRequest/Response`, `ChallengeStatusResponse`.
- [x] 2.2 Add Zod enums for `ChallengeMode` (6 values) and `AttemptStatus` (13 values) and `ChallengeInvalidReason` (8 values: `timeout`, `invalid-token`, `session-conflict`, `tab-conflict`, `no-entry-token`, `browser-refresh`, `policy-rejected`, `admin-revoked`).
- [x] 2.3 Rebuild `@brain-games/shared`; downstream consumers should compile (until they break in step 8/10).

## 3. ChallengesModule scaffolding

- [x] 3.1 Create `apps/api/src/challenges/` with `challenges.module.ts`, `challenges.controller.ts`, `challenges.service.ts`.
- [x] 3.2 Implement `challenge-state-machine.ts` with the legal transition map and `assertCanTransition(from, to, verb)` helper.
- [x] 3.3 Implement `entry-token.service.ts`: `generate(): { rawToken: string; hash: string }` using `crypto.randomBytes(32).toString('base64url')` and `sha256`.
- [x] 3.4 Implement `runtime-session.service.ts`: `create()`, `claim()`, `markHeartbeat()`, `revoke()`.
- [x] 3.5 Implement `challenge-audit.service.ts`: `record({attemptId, action, fromStatus, toStatus, reason, ...})`.

## 4. ChallengesService — six endpoints

- [x] 4.1 `start({userId, gameSlug, mode, difficultyKey, puzzleSlug?, idempotencyKey, ipAddress, userAgent})` → returns full response.
- [x] 4.2 `claim({userId, attemptId, entryToken, playSessionId, ipAddress})` → returns claim response or rejection.
- [x] 4.3 `heartbeat({userId, attemptId, playSessionId, clientNow, phase, localElapsedMs})` → returns heartbeat response.
- [x] 4.4 `abandon({userId, attemptId, playSessionId, reason})` → idempotent.
- [x] 4.5 `finish({userId, attemptId, playSessionId, finalState, metrics})` → invokes adapter, writes validation report, transitions to COMPLETED.
- [x] 4.6 `getStatus({userId, attemptId})` → returns ChallengeStatusResponse.
- [x] 4.7 All methods use CAS conditional updates (`prisma.gameAttempt.updateMany` with `where: { id, status: expected, statusVersion: expectedVersion }`).
- [x] 4.8 Every transition emits `ChallengeAuditLog` via `challenge-audit.service`.

## 5. ChallengesController

- [x] 5.1 POST `/challenges/start` — RequirePermission `game:read`; body validated by Zod; returns StartChallengeResponse.
- [x] 5.2 POST `/challenges/:attemptId/claim` — same.
- [x] 5.3 POST `/challenges/:attemptId/heartbeat`.
- [x] 5.4 POST `/challenges/:attemptId/abandon`.
- [x] 5.5 POST `/challenges/:attemptId/finish`.
- [x] 5.6 GET `/challenges/:attemptId/status`.
- [x] 5.7 All endpoints use `JwtAuthGuard` (Change 2); 401 on no token; 403 on user mismatch (attempt belongs to different user); 404 on missing attempt.

## 6. GameAdapter contract + Registry

- [x] 6.1 Rewrite `apps/api/src/games/game-adapter.interface.ts` per design §GameRuntimeAdapter.
- [x] 6.2 Create `apps/api/src/games/game-adapter-registry.service.ts` exposing `register(adapter)` and `get(engineKey): GameRuntimeAdapter`.
- [x] 6.3 Wire registry into `GamesModule` exports so ChallengesModule can import it.

## 7. Per-game adapters (start + finish only)

- [x] 7.1 `apps/api/src/games/sliding-puzzle/sliding-puzzle.adapter.ts` — port existing start (seed-based generator) + finish (validator from `@brain-games/game-engine`).
- [x] 7.2 `apps/api/src/games/life-game/life-game.adapter.ts` — start picks a published `PuzzleVersion` for the difficulty; finish validates against `referenceSolution`.
- [x] 7.3 `apps/api/src/games/precise-character-building/precise-character-building.adapter.ts` — similar pattern.
- [x] 7.4 `apps/api/src/games/absolute-command/absolute-command.adapter.ts` — similar pattern. `verifySubmission` stubbed to throw `not_implemented` (filled in Change 7).
- [x] 7.5 Each adapter registers itself in its module's `onModuleInit` via the registry.

## 8. GamesModule cleanup

- [x] 8.1 Rewrite `apps/api/src/games/games.controller.ts` to only expose `GET /api/games` and `GET /api/games/:slug` returning catalog + ACTIVE difficulties + supportedModes + contentMode.
- [x] 8.2 Delete `apps/api/src/games/attempt-timeout.ts`.
- [x] 8.3 Delete the `apps/api/src/attempts/` directory entirely (functionality moves to `challenges/`).
- [x] 8.4 Rewrite per-game module files (`life-game/life-game.module.ts`, etc.) to register adapter only; remove legacy controllers/services that talked to removed Prisma types.

## 9. ChallengeReaperWorker

- [x] 9.1 Add `@nestjs/schedule` dependency to `apps/api/package.json`.
- [x] 9.2 Create `apps/api/src/challenges/challenge-reaper.worker.ts` with `@Cron('*/30 * * * * *')` method.
- [x] 9.3 Logic: SELECT FOR UPDATE SKIP LOCKED (raw SQL) on attempts past `expiresAt`; CAS to `TIMEOUT`; emit audit. Then same for `lastHeartbeatAt + heartbeatTimeoutSec < now`; CAS to `INTERRUPTED`.
- [x] 9.4 Register worker in `ChallengesModule.providers`.
- [x] 9.5 Wire `ScheduleModule.forRoot()` into `AppModule`.

## 10. AppModule re-wire

- [x] 10.1 Import `GamesModule`, `ChallengesModule` in `apps/api/src/app.module.ts`.
- [x] 10.2 Verify `pnpm api -- pnpm build` succeeds; `leaderboards` still excluded.
- [x] 10.3 Boot the API; smoke `/api/games` returns 4 games with ACTIVE difficulties.

## 11. Web Challenge Runtime — core

- [x] 11.1 Create `apps/web/src/challenge/core/challenge-types.ts` with `ChallengePhase`, `ChallengeRuntimeState`, etc.
- [x] 11.2 Create `apps/web/src/challenge/core/challenge-runtime-store.ts` (Zustand).
- [x] 11.3 Create `apps/web/src/challenge/core/challenge-policy.ts` resolving the SPA-visible parts of `GameChallengePolicy` (heartbeatIntervalSec, allowResume, etc.).
- [x] 11.4 Create `apps/web/src/challenge/core/challenge-navigation-manager.ts` exposing `beginChallenge`, `claim`, `submit`, `leave`.
- [x] 11.5 Create `apps/web/src/challenge/core/challenge-route-guard.ts` for use in `beforeLoad`.
- [x] 11.6 Create `apps/web/src/challenge/core/challenge-blocker.ts` (React + TanStack Router `useBlocker`).
- [x] 11.7 Create `apps/web/src/challenge/core/challenge-heartbeat.ts` (`useChallengeHeartbeat` hook).
- [x] 11.8 Create `apps/web/src/challenge/core/challenge-broadcast.ts` (`BroadcastChannel`).
- [x] 11.9 Create `apps/web/src/challenge/core/challenge-errors.ts` with `ChallengeError` class + reason enum.

## 12. Web Challenge — adapters

- [x] 12.1 Create `apps/web/src/challenge/adapters/game-runtime-adapter.ts` (client-side interface — render config, finalState builder, post-finish redirect).
- [x] 12.2 Create per-game client adapters under `apps/web/src/challenge/adapters/<slug>.adapter.ts` (4 files).
- [x] 12.3 Create `apps/web/src/challenge/adapters/registry.ts` populated at module load.

## 13. Web Challenge — components

- [x] 13.1 `ChallengeStartPage.tsx` — difficulty/mode selector → calls `beginChallenge()`.
- [x] 13.2 `ChallengePlayHost.tsx` — mounts heartbeat + blocker + broadcast + the per-game render output via adapter.
- [x] 13.3 `ChallengeResultPage.tsx` — shows result, links to leaderboard / start over.
- [x] 13.4 `ChallengeExpiredPage.tsx` — shows reason, links to start over.
- [x] 13.5 `LeaveChallengeDialog.tsx` — confirm/cancel.
- [x] 13.6 `ChallengeStatusBoundary.tsx` — wraps `ChallengePlayHost`, runs route-guard `/status` query, redirects on terminal.

## 14. Web Challenge — api

- [x] 14.1 Create `apps/web/src/challenge/api/challenge-api.ts` with one function per endpoint.
- [x] 14.2 Create `apps/web/src/challenge/api/challenge-query-keys.ts` for React Query cache keys.

## 15. Web router

- [x] 15.1 Add file-based route `apps/web/src/app/routes/games.$gameSlug.start.tsx` rendering `ChallengeStartPage`.
- [x] 15.2 Add `games.$gameSlug.attempts.$attemptId.play.tsx` rendering `ChallengePlayHost` inside `ChallengeStatusBoundary`.
- [x] 15.3 Add `games.$gameSlug.attempts.$attemptId.result.tsx`.
- [x] 15.4 Add `games.$gameSlug.attempts.$attemptId.expired.tsx`.
- [x] 15.5 Replace existing `games.$gameSlug.play.tsx` (and game-specific play variants) with `redirect()` to `/start`.
- [x] 15.6 Regenerate route tree; verify `pnpm --filter web build` passes.

## 16. End-to-end smoke

- [x] 16.1 Start API + web + DB locally.
- [x] 16.2 Login as `demo@example.com / Demo123456` (seeded in Change 2).
- [x] 16.3 Navigate `/games/sliding-puzzle/start`; choose easy/RANKED; click Begin.
- [x] 16.4 Verify URL becomes `/games/sliding-puzzle/attempts/<id>/play`; observe countdown; play to solve.
- [x] 16.5 Verify finish flows to `/result` with score/duration shown.
- [x] 16.6 Open the play URL in a second tab → first tab navigates to `/expired` with reason `tab-conflict`.
- [x] 16.7 Refresh `/play` mid-game → router redirects to `/expired` with reason `no-entry-token`.
- [x] 16.8 Wait past `expiresAt`; verify reaper transitions attempt to `TIMEOUT` within 30 seconds (`ChallengeAuditLog` row inserted).

## 17. Documentation

- [x] 17.1 Create `docs/Overview-Challenge-Runtime.md`: state-machine diagram, endpoint table, entry-token flow, runtime-session flow, reaper, GameRuntimeAdapter contract.
- [x] 17.2 Update `docs/Overview-Framework.md` "过渡说明": mark Challenge Runtime stream complete.
- [x] 17.3 Add a per-game adapter quick-start snippet near the bottom of `Overview-Challenge-Runtime.md` (will be promoted to `rule-implement-runtime-adapter.md` in the final cleanup change).

## 18. Handoff to Change 4 / 5 / 6 / 7

- [x] 18.1 Verify `verifySubmission` stub returns `not_implemented` — Change 7 fills these in.
- [x] 18.2 Verify `finish` writes only `GameAttempt` and `AttemptValidationReport` — Change 5 wires leaderboard pipeline.
- [x] 18.3 Verify reaper is plain `@nestjs/schedule` — Change 6 promotes to BullMQ.
- [x] 18.4 Communicate: API server is now fully runnable for sliding-puzzle end-to-end; other 3 games can start+finish but mid-game submissions return 501.
