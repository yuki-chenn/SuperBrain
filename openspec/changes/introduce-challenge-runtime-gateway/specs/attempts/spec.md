# attempts Capability (delta for change `introduce-challenge-runtime-gateway`)

## REMOVED Requirements

### Requirement: Authenticated attempt ownership
**Reason**: Replaced by the `challenges` capability. The new `/api/challenges/*` endpoints carry the same JWT/ownership requirements but use `attemptId` path params and CAS state-machine semantics rather than the legacy `STARTED|COMPLETED|INVALID|ABANDONED` enum.
**Migration**: SPA must call `POST /api/challenges/start` instead of `POST /api/attempts`; subsequent calls use `POST /api/challenges/:id/{claim|heartbeat|finish|abandon}`. The legacy `POST /api/attempts/*` endpoints are removed.

### Requirement: Two-phase start lifecycle
**Reason**: Replaced by the unified `start → claim → heartbeat(phase='playing')` sequence in `challenges`.
**Migration**: The `start-playing` signal is now an implicit heartbeat with `phase='playing'` which triggers the server-side `CLAIMED → PLAYING` CAS transition.

### Requirement: GameAdapter contract (legacy)
**Reason**: Replaced by the server-side `GameRuntimeAdapter` interface defined in the `challenges` capability. Old shape `{ slug, startAttempt, finishAttempt }` is superseded by the version-aware shape that receives `ruleSetVersion`, `difficulty`, `puzzleVersion`, `policySnapshot`.
**Migration**: Each game module rewrites its adapter to the new interface; legacy `slug` field maps to `engineKey` and adapters are registered in `GameAdapterRegistry` at module bootstrap.

### Requirement: Per-game generic finish/abandon rejection
**Reason**: All games now share `POST /api/challenges/:id/finish` and `POST /api/challenges/:id/abandon`. The rejection behaviour for life-game and precise-character-building (which required dedicated submission endpoints) is replaced by the upcoming `POST /api/challenges/:id/submissions` endpoint in Change 7.
**Migration**: Mid-game submission endpoints (life region submit, PCB round submit, AC command submit) move to `POST /api/challenges/:id/submissions { type, payload }` in Change 7. For this change, only `finish` is exercised end-to-end for sliding-puzzle; the other games are stubbed.

### Requirement: Timeout via attempt-timeout helper
**Reason**: Replaced by `ChallengeReaperWorker` (cron in this change, BullMQ in Change 6) plus per-attempt `expiresAt` enforced inside `/heartbeat` and `/finish`.
**Migration**: Delete `apps/api/src/games/attempt-timeout.ts`; the reaper performs equivalent work but driven by `(status, expiresAt)` and `(status, lastHeartbeatAt)` partial indexes plus per-policy timeout values.
