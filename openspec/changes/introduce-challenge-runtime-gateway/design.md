# Design — introduce-challenge-runtime-gateway

## Context

Doc 7 (`docs/7-superbrain-game-navigation-architecture.md`) defines the desired Challenge Runtime Gateway. Change 1 created the data model; Change 2 brought back auth and RBAC. This change builds the end-to-end runtime gateway server + client.

The legacy flow was: SPA POST `/api/attempts` → server creates `GameAttempt(status=STARTED)` → SPA navigates to `/play` → SPA POST `/api/attempts/:id/finish`. This had no idempotency, no version locking, no claim step, no entry token, no heartbeat, no audit, no policy snapshot, no recovery rules — every browser back/forward/refresh edge case was undefined.

The new flow is:

```
SPA   /games/$slug/start                  (page, no state in URL)
       │  POST /api/challenges/start { gameSlug, mode, difficultyKey, idempotencyKey }
       ▼
SPA   /games/$slug/attempts/$attemptId/play?token=<entryToken>
       │  POST /api/challenges/$attemptId/claim { entryToken, playSessionId }
       │  (CAS: status CREATED→CLAIMED, then CLAIMED→PLAYING after countdown)
       │  POST /api/challenges/$attemptId/heartbeat { playSessionId, ... }   (every 5s)
       │  POST /api/challenges/$attemptId/finish { playSessionId, finalState, metrics }
       │  POST /api/challenges/$attemptId/abandon { playSessionId, reason }
       ▼
SPA   /games/$slug/attempts/$attemptId/result    (success)
SPA   /games/$slug/attempts/$attemptId/expired   (timeout/abandon/interrupt)
```

Critical invariants:
- The SPA never creates `GameAttempt` rows directly. All creation flows through `/api/challenges/start`.
- The `entryToken` is single-use, generated on `start`, hashed on the server (`entryTokenHash`), returned in plaintext once to the SPA. It is consumed on `claim`. Browser refresh on `/play` will fail `claim` (no token in memory) — RANKED/DAILY modes route to `/expired`; PRACTICE may recover from sessionStorage.
- The `playSessionId` is generated client-side per browser tab and persisted to `AttemptRuntimeSession.playSessionId`. Subsequent heartbeat/finish/abandon must present the same `playSessionId`. A second tab presenting a different `playSessionId` for the same attempt fails the partial unique index `uq_attempt_active_runtime_session`.

## Goals / Non-Goals

**Goals**
- Server-authoritative, CAS-enforced `AttemptStatus` state machine (13 values, ~20 legal transitions).
- All 6 challenge endpoints functional under the new RBAC guard (anonymous users get 401; authenticated get appropriate 403/200).
- `entryToken` + `playSessionId` enforce single-tab ownership.
- Client `ChallengeRuntimeStore` (Zustand) tracks `phase | attemptStatus | remainingMs | conflictDetected` without ever being the source of truth.
- `ChallengeRouteGuard` intercepts all `/play|result|expired` routes and queries `/api/challenges/:id/status` to decide whether to render, redirect, or block.
- `ChallengeBroadcast` uses `BroadcastChannel` to detect another tab claiming the same attempt and triggers a local force-leave on the loser tab.
- Old `/play` URLs redirect to `/start` so back/forward navigation cannot bypass the new flow.
- Each request emits a `ChallengeAuditLog` row with `action`, `fromStatus`, `toStatus`, `reason`, `requestId`, `playSessionId`, `ipAddress`.
- ChallengeReaperWorker runs every 30s (cron) and transitions stuck attempts (`expiresAt < now` or `lastHeartbeatAt < now - heartbeatTimeoutSec`).

**Non-Goals**
- ScoreRecord / LeaderboardBest writes are NOT done here. `finishAttempt` only updates `GameAttempt` and writes `AttemptValidationReport`. Change 5 wires the leaderboard pipeline.
- Mid-game submission endpoints (life region submit, PCB round submit, AC command submit) are stubbed; Change 7 plumbs them through `POST /api/challenges/:id/submissions { type, payload }`.
- BullMQ is NOT introduced; the reaper runs as a simple Nest scheduled task (`@nestjs/schedule`). Change 6 promotes it to BullMQ.
- Redis distributed locks are NOT introduced. CAS-on-DB + partial unique index is the only concurrency primitive. Change 6 adds Redis locks for additional protection.
- Idempotency records are NOT yet written to `IdempotencyRecord`; we rely on `GameAttempt.idempotencyKey` unique-per-user to deduplicate `start`. Full `IdempotencyRecord` middleware lands in Change 6.
- Admin SPA changes (attempt-detail page) deferred.

## State Machine

```
                          ┌────────────┐
                          │  CREATED   │  ← /challenges/start
                          └─────┬──────┘
                  claim         │
                  ───────────►──┘
                          ┌────────────┐
                          │  CLAIMED   │
                          └─────┬──────┘
                  start-playing │
                  ───────────►──┘
                          ┌────────────┐
            ┌─────────────│  PLAYING   │─────────────┐
            │             └─────┬──────┘             │
       finish OK              pause                abandon
            │             ───────────────►            │
            │             ┌────────────┐             │
            │             │   PAUSED   │             │
            │             └─────┬──────┘             │
            ▼                   │ resume             ▼
     ┌─────────────┐            ▼              ┌─────────────┐
     │ SUBMITTING  │       (back to PLAYING)   │  ABANDONED  │
     └──────┬──────┘                           └─────────────┘
            │ verify ok                          │
            ▼                                    ▼
     ┌─────────────┐  hb timeout    ┌─────────────┐
     │  COMPLETED  │ ───────────►   │   TIMEOUT   │
     └─────────────┘                └─────────────┘
            │                          │
            │  reap/conflict           ▼
            ▼                       ┌─────────────┐
     ┌─────────────┐                │ INTERRUPTED │
     │ INVALIDATED │                └─────────────┘
     └─────────────┘

Terminal review path (admin only, Change 6):
   any terminal  → REVIEW_REQUIRED  → REVOKED | ADMIN_CORRECTED
```

Encoded as a static `Map<AttemptStatus, Set<AttemptStatus>>` in `challenge-state-machine.ts`. Every legal transition has a verb (`'claim'`, `'start-playing'`, `'pause'`, `'resume'`, `'submit'`, `'verify-success'`, `'abandon'`, `'timeout'`, `'interrupt'`, `'invalidate'`, `'request-review'`, `'revoke'`, `'admin-correct'`).

## CAS Update Pattern

Every transition uses a single SQL statement:

```ts
const result = await prisma.gameAttempt.updateMany({
  where: {
    id: attemptId,
    status: expectedFromStatus,
    statusVersion: expectedStatusVersion,
    // optional: playSessionId equality for tab-ownership protected transitions
  },
  data: {
    status: toStatus,
    statusVersion: { increment: 1 },
    // plus the appropriate timestamp field for this transition
  },
});
if (result.count === 0) {
  // Refetch to determine why: stale version? wrong status? rejection-with-idempotent-response?
}
```

If `count = 1`: transition succeeded, emit `ChallengeAuditLog`, continue.  
If `count = 0`: refetch `GameAttempt`, decide whether to return current state (idempotent re-issue) or fail.

## Endpoints

### POST /api/challenges/start
- Auth: requires `game:read` permission (so guests get 401 unless logged in).
- Request: `{ gameSlug, mode, difficultyKey, puzzleSlug?, idempotencyKey }`.
- Server:
  1. Load `Game(slug)` PUBLISHED; error 404 otherwise.
  2. Load active `GameRuleSetVersion`, `GameDifficulty(key)`, `GameChallengePolicy(mode, difficulty)`, `GameContentPolicy(mode, difficulty)`. All must be ACTIVE; else 409.
  3. If `mode IN [RANKED, DAILY]`: check `uq_user_active_ranked_attempt` — if an active attempt exists, return its current `playPath` (idempotent).
  4. Resolve content: `GENERATED` → call adapter's `startAttempt` to obtain seed/initialState/generatedContentHash; `CURATED` → pick a `Puzzle` whose `PuzzleVersion(PUBLISHED)` matches the difficulty filter, optionally pinned by `puzzleSlug`.
  5. INSERT `GameAttempt` with full version snapshot (`ruleSetVersionId`, `difficultyId`, `difficultyVersion`, `contentPolicyId`, `challengePolicyId`, `puzzleId?`, `puzzleVersionId?`, `seed`, `generatedContentHash?`, `policySnapshot=copyOfPolicyJson`, `idempotencyKey`, `expiresAt = now + difficulty.maxDurationMs + countdownGrace`).
  6. INSERT `AttemptRuntimeSession` with `entryTokenHash = sha256(rawToken)`, `playSessionId = cuid()`, `status=CREATED`, `expiresAt = now + 2 min` (claim window).
  7. INSERT `ChallengeAuditLog { action: 'START', fromStatus: null, toStatus: 'CREATED', metadata: { mode, difficulty } }`.
  8. Return `{ attemptId, gameSlug, mode, difficultyKey, entryToken: rawToken, playSessionId, seed?, initialState, maxDurationMs, startedAt, expiresAt, playPath: '/games/<slug>/attempts/<id>/play?token=<rawToken>' }`.

### POST /api/challenges/:attemptId/claim
- Auth: same user as `GameAttempt.userId`.
- Request: `{ entryToken, playSessionId }`.
- Server:
  1. Load `GameAttempt`. Verify `userId` matches.
  2. Hash `entryToken` and look up `AttemptRuntimeSession` by `(attemptId, entryTokenHash)`.
  3. If runtime session not found or status not in `[CREATED, CLAIMED]`: return `{ canEnter: false, redirectTo: '/expired', reason: 'invalid-token' }`.
  4. CAS GameAttempt: `CREATED → CLAIMED` (requires `statusVersion` match). On loss, refetch and return idempotent response.
  5. Update runtime session: `status=CLAIMED, claimedAt=now`.
  6. Emit audit log.
  7. Return `{ canEnter: true, status: 'CLAIMED', seed, initialState, startedAt, expiresAt }`.
- Note: a second `claim` from a DIFFERENT `playSessionId` is rejected by `uq_attempt_active_runtime_session`. The runtime session also rejects if it's already `CLAIMED` by another session.

### POST /api/challenges/:attemptId/heartbeat
- Auth: same user, valid `playSessionId` for the attempt.
- Request: `{ playSessionId, clientNow, phase, localElapsedMs }`.
- Server:
  1. Load runtime session by `playSessionId`. Verify attempt match.
  2. UPDATE both `GameAttempt.lastHeartbeatAt = now` and `AttemptRuntimeSession.lastHeartbeatAt = now`.
  3. If `attempt.expiresAt < now`: CAS `PLAYING → TIMEOUT`, set `timeoutAt = expiresAt`, emit audit, return `{ accepted: false, status: 'TIMEOUT', remainingMs: 0 }`.
  4. CAS `CLAIMED → PLAYING` if `phase === 'playing'` and current status is `CLAIMED` (covers the end-of-countdown signal).
  5. Return `{ accepted: true, serverNow, status, remainingMs: expiresAt - now }`.

### POST /api/challenges/:attemptId/abandon
- Auth: same user, valid `playSessionId`.
- Request: `{ playSessionId, reason }`.
- Server: CAS `PLAYING|CLAIMED|CREATED → ABANDONED`. Idempotent: if already terminal, return current. Emit audit.

### POST /api/challenges/:attemptId/finish
- Auth: same user, valid `playSessionId`.
- Request: `{ playSessionId, finalState, metrics }`.
- Server:
  1. CAS `PLAYING → SUBMITTING`. On loss, refetch; if `COMPLETED`, return idempotent. Else 409.
  2. Resolve adapter via `GameAdapterRegistry.get(ruleSet.engineKey)`.
  3. Call `adapter.finishAttempt({ attempt, ruleSet, difficulty, puzzleVersion?, finalState, seed, metrics })` → `{ passed, scoreValue, durationMs, metrics, antiCheatFlags }`.
  4. INSERT `AttemptValidationReport`.
  5. CAS `SUBMITTING → COMPLETED` with `completedAt = now, durationMs, scoreValue, validationStatus = passed ? VALID : INVALID, scoreEligibility = passed && policy.eligibleForLeaderboard ? ELIGIBLE : NOT_ELIGIBLE`.
  6. Emit audit.
  7. Return `{ accepted: true, status, result: { success, score, durationMs, metrics }, resultPath: '/games/<slug>/attempts/<id>/result' }`.
- Note: ScoreRecord/LeaderboardBest writes are NOT done here; Change 5 adds them inside the same transaction.

### GET /api/challenges/:attemptId/status
- Auth: same user (or admin with `attempt:read` once added in Change 6).
- Server: load `GameAttempt`, return current state + `resultPath` / `expiredPath` hints. Used by route guard.

## Client Runtime

### ChallengeNavigationManager
Owns transitions between `/start`, `/play`, `/result`, `/expired`. Exposes:
- `beginChallenge({ gameSlug, mode, difficultyKey })` → calls `/api/challenges/start`, stores `entryToken` and `playSessionId` in memory + sessionStorage (PRACTICE only), navigates to `/play?token=...`.
- `claim()` → called once on `/play` mount; on success transitions Zustand store to `phase = 'countdown' | 'playing'`; on failure navigates to `/expired` with reason.
- `submit({ finalState, metrics })` → calls `/finish`, navigates to `/result`.
- `leave({ reason })` → calls `/abandon`, navigates to `/expired`.

### ChallengeRouteGuard
TanStack Router `beforeLoad` on every challenge route:
1. If route is `/play`: ensure `entryToken` in memory; if missing AND mode is RANKED/DAILY → redirect to `/start`. PRACTICE may restore from sessionStorage.
2. Call `GET /api/challenges/:id/status`. If status is terminal and route is `/play` → redirect to `/result` or `/expired` accordingly.
3. If status is `PLAYING|CLAIMED` and route is `/result`/`/expired` → redirect back to `/play`.

### ChallengeBlocker
React component wrapping `BlockerFunction` from TanStack Router:
- On navigation away from `/play` while attempt is PLAYING: show `LeaveChallengeDialog`. User confirm → abandon + leave; cancel → stay.
- Browser tab close → `navigator.sendBeacon('/api/challenges/:id/abandon', { reason: 'browser-close', playSessionId })`.

### ChallengeHeartbeat
Hook `useChallengeHeartbeat(attemptId, intervalSec)`:
- Calls `/heartbeat` every `intervalSec`. On response `accepted=false` → navigate to `/expired`.
- Pauses on document.hidden (tab background) for ≤ heartbeatTimeoutSec window, then forces a heartbeat on visibility return.

### ChallengeBroadcast
- Opens a `BroadcastChannel(`challenge:${attemptId}`)`.
- On mount of `/play`, broadcasts `{ type: 'claim', playSessionId }`. If another tab receives a claim with a different `playSessionId`, it forces local Zustand `conflictDetected = true`, calls `/abandon { reason: 'tab-conflict' }`, navigates to `/expired`.

### ChallengeRuntimeStore (Zustand)
Local UI state only: `phase` (`idle|countdown|playing|submitting|done|expired|error`), `attemptStatus`, `remainingMs`, `conflictDetected`, `lastServerSync`. Never persisted (RANKED/DAILY); PRACTICE persists `attemptId + entryToken + playSessionId` to sessionStorage.

## GameRuntimeAdapter (server-side)

```ts
export interface GameRuntimeAdapter<TInit = unknown, TFinal = unknown> {
  engineKey: string;
  startAttempt(input: {
    game: Game; ruleSetVersion: GameRuleSetVersion;
    difficulty: GameDifficulty; contentPolicy: GameContentPolicy;
    challengePolicy: GameChallengePolicy;
    mode: ChallengeMode; userId: string; puzzleVersion?: PuzzleVersion;
  }): Promise<{
    seed?: string;
    initialState: TInit;
    contentResolvedType: ContentMode;
    puzzleId?: string;
    puzzleVersionId?: string;
    generatedContentHash?: string;
    maxDurationMs: number;
  }>;
  finishAttempt(input: {
    attempt: GameAttempt; ruleSetVersion: GameRuleSetVersion;
    difficulty: GameDifficulty; puzzleVersion?: PuzzleVersion;
    finalState: TFinal; metrics?: Record<string, unknown>;
  }): Promise<{
    passed: boolean;
    scoreValue?: number;
    durationMs?: number;
    metrics: Record<string, unknown>;
    antiCheatFlags: string[];
    validatorKey: string;
    validatorVersion?: string;
  }>;
  verifySubmission?(input: {  // optional; Change 7 fills in
    attempt: GameAttempt;
    submissionType: SubmissionType;
    payload: unknown;
  }): Promise<{ valid: boolean; result?: unknown; reject?: string }>;
}
```

Each game module exports a class implementing this interface and registers it in module bootstrap. The Registry holds a `Map<engineKey, GameRuntimeAdapter>`.

## Risks / Trade-offs

- **[Risk]** CAS failure semantics for `start` are tricky when an idempotency key matches but the request body differs. → **Mitigation**: `start` always rehashes the request payload and rejects if `(userId, idempotencyKey)` exists with different payload hash. Use HTTP 409 `idempotency-key-conflict`.
- **[Risk]** Client clock skew breaks heartbeat math. → **Mitigation**: server is authoritative for `remainingMs`; client computes display countdown from `serverNow - clientNow` offset captured on each heartbeat.
- **[Risk]** TanStack Router blocker can be dismissed by the user → attempt never marked ABANDONED. → **Mitigation**: `pagehide` + `sendBeacon` fallback; ChallengeReaperWorker catches the rest within `heartbeatTimeoutSec`.
- **[Risk]** Old `/play` redirects break bookmarked games. → **Accepted**; redirect lands on `/start`.
- **[Trade-off]** Two tables (`GameAttempt` + `AttemptRuntimeSession`) for one challenge. → **Accepted**; lets one attempt have multiple resolved sessions across admin intervention.
- **[Trade-off]** Reaper as `@nestjs/schedule` not BullMQ. → **Accepted** for this change; Change 6 promotes it.

## Migration Plan

1. Implement state machine map + audit-writing helpers.
2. Implement `EntryTokenService` and `RuntimeSessionService`.
3. Implement `ChallengesService` + `ChallengesController` (six endpoints).
4. Implement `GameAdapterRegistry` and per-game adapter shells (start + finish only).
5. Move sliding-puzzle adapter logic from old code into the new shape.
6. Update games module to drop legacy start endpoints; expose only catalog query.
7. Wire `ChallengesModule + GamesModule` into `AppModule`. Remove from `tsconfig.exclude`.
8. Update `@brain-games/shared` schemas; rebuild.
9. Build web `Challenge` directory: core, adapters, components, api.
10. Add new TanStack routes; convert old `/play` to `redirect()`.
11. Add `ChallengeReaperWorker` (interval 30s).
12. Manual smoke per the verification gate below.

**Rollback**: revert commits. Schema is unaffected.

**Verification gate**:
- API: register/login (Change 2) still works; POST /api/challenges/start returns 200; second start request with same idempotencyKey returns the same attemptId; second RANKED start without idempotencyKey returns the same active attempt; claim succeeds; heartbeat returns remainingMs decreasing; finish returns 200 with resultPath; a second finish returns idempotent COMPLETED.
- DB: ChallengeAuditLog row count grows by one per transition.
- Partial unique indexes catch a manual second-tab claim attempt.
- Web: SPA can complete one end-to-end sliding-puzzle attempt (start → countdown → play → finish → result); /play URL without token redirects to /start.

## Open Questions

1. Should the entry token be JWT or random bytes? **Adopted**: 32-byte random base64url; hashed sha256 server-side. No payload needed; we already store all state in `AttemptRuntimeSession`.
2. Should heartbeat carry an HMAC of `{attemptId, playSessionId, serverNow}` to detect tampering? **Deferred** to Change 6 anti-cheat hardening.
3. Should the SPA poll `/status` periodically as a safety net even with heartbeat? **Adopted**: only on regain-visibility events, not periodic.
4. How to handle PRACTICE mode "resume on refresh"? **Adopted**: store `{attemptId, entryToken, playSessionId}` in `sessionStorage` under key `practice:<gameSlug>`; on `/play` mount if `entryToken` missing in memory but present in sessionStorage AND mode === PRACTICE, restore and call `/claim`. RANKED never persists.
