# Tasks — harden-concurrency-stack

## 1. Preparation

- [x] 1.1 Confirm Changes 1–5 merged; `pnpm api -- pnpm build` passes for full backend.
- [x] 1.2 Add dependencies: `bullmq`, `@nestjs/bullmq`, `@nestjs/terminus`, `@nestjs/throttler-storage-redis` (or `nestjs-throttler-storage-redis`), `gunzip-maybe`+`zlib` (node stdlib).
- [x] 1.3 Document in PR which env vars are required (`DATABASE_URL`, `DATABASE_URL_DIRECT`, `REDIS_URL`, `WORKER_INSTANCE_COUNT`, `ARCHIVE_DIR`).

## 2. Queues module

- [x] 2.1 Create `apps/api/src/queues/queue-names.ts` exporting constants for the 5 queue names.
- [x] 2.2 Create `apps/api/src/queues/queues.module.ts` registering all 5 queues with shared default options (attempts=3, exponential backoff, removeOnComplete age=3600, removeOnFail attempts).
- [x] 2.3 Inject queue tokens via `BullModule.registerQueue` per queue.
- [x] 2.4 Expose convenience producers (`enqueueChallengeReaper()`, `enqueueLeaderboardRefresh(...)`, etc.) so callers don't depend on `Queue` directly.

## 3. RedisLockService

- [x] 3.1 Create `apps/api/src/common/redis-lock.service.ts` with `acquire(key, ttlMs)`, `release(key, token)`, `withLock(key, ttlMs, fn)`.
- [x] 3.2 Use `SET key token NX PX ttl`; release via Lua script `if redis.call('get',KEYS[1])==ARGV[1] then redis.call('del',KEYS[1]) end`.
- [x] 3.3 On busy: retry 50ms × 3, then throw `LockBusyError`.
- [x] 3.4 Unit tests.

## 4. IdempotencyInterceptor

- [x] 4.1 Create `apps/api/src/common/idempotency/idempotency.interceptor.ts` per design D4.
- [x] 4.2 Create `@RequireIdempotency()` decorator.
- [x] 4.3 Create `IdempotencyService.findOrCreate(...)`, `markSucceeded(...)`, `markFailed(...)`.
- [x] 4.4 Register interceptor globally in `AppModule`; apply only to handlers with `@RequireIdempotency()` metadata (or to all POST/PATCH/DELETE under `/api/challenges` and `/api/admin`).
- [x] 4.5 Add `Idempotency-Key` header validation (UUID-shape) at the interceptor.

## 5. Worker entrypoint

- [x] 5.1 Create `apps/api/src/main.workers.ts` that boots a Nest application with `WorkersModule` (no HTTP server).
- [x] 5.2 Create `apps/api/src/workers/workers.module.ts` importing `PrismaModule`, `RedisModule`, `QueuesModule`, and the 5 worker provider classes.
- [x] 5.3 Add `pnpm dev:workers` script: `nodemon --exec tsx src/main.workers.ts`.
- [x] 5.4 Add `pnpm start:workers` (built JS).

## 6. ChallengeReaperWorker migration

- [x] 6.1 Replace `@nestjs/schedule`-based reaper from Change 3 with BullMQ processor under `apps/api/src/workers/challenge-reaper.worker.ts`.
- [x] 6.2 Create `apps/api/src/workers/schedulers/reaper-scheduler.service.ts` registered in the WORKERS process that enqueues a `challenge-reaper` job every 30s (`@Cron('*/30 * * * * *')`).
- [x] 6.3 Worker logic: ZRANGEBYSCORE `attempts-by-hb` for stale; SELECT FOR UPDATE; CAS to INTERRUPTED. Separate scan: PG `(status, expiresAt)` partial index for past-expiry; CAS to TIMEOUT.

## 7. Heartbeat dual-write

- [x] 7.1 Inject `RedisService` into `ChallengeHeartbeatService` (or wherever heartbeat handler lives).
- [x] 7.2 On heartbeat: pipeline `ZADD attempts-by-hb <ts> <id>` + `HSET attempt:<id> hb <ts> phase <phase>` + `EXPIRE attempt:<id> 60`.
- [x] 7.3 On terminal transition (TIMEOUT/COMPLETED/etc): `ZREM attempts-by-hb <id>` + `DEL attempt:<id>`.

## 8. LeaderboardRefreshWorker migration

- [x] 8.1 Replace the `@nestjs/schedule` worker from Change 5 with BullMQ processor under `apps/api/src/workers/leaderboard-refresh.worker.ts`.
- [x] 8.2 Refresh scheduler enqueues every 60s.
- [x] 8.3 Wrap each `(leaderboardId, periodId)` refresh in `RedisLockService.withLock('lock:leaderboard-refresh:<id>:<periodId>', 30_000, fn)`.
- [x] 8.4 On-write hint: `ScoreRecordingService` enqueues a `leaderboard-refresh` job with `data: { leaderboardId, periodId }` (debounce by deduping job IDs).

## 9. OperationLogFlushWorker

- [x] 9.1 Create `apps/api/src/workers/operation-log-flush.worker.ts`.
- [x] 9.2 API request handler (when `OperationLogMode != NONE`): batches op-log entries client-side (already in payload), enqueues `operation-log-flush` jobs with the batch payload.
- [x] 9.3 Worker writes `AttemptOperationLog` + `AttemptOperationBatch` rows in a single transaction.

## 10. AuditLogWorker

- [x] 10.1 Create `apps/api/src/workers/audit-log.worker.ts`.
- [x] 10.2 Create `AuditLogProducer.enqueue({actorUserId, action, resourceType, resourceId, before, after, metadata})`.
- [x] 10.3 Replace direct `prisma.adminAuditLog.create` calls in admin services with `AuditLogProducer.enqueue`.
- [x] 10.4 Worker drains queue and writes `AdminAuditLog` rows.

## 11. RetentionArchiveWorker

- [x] 11.1 Create `apps/api/src/workers/retention-archive.worker.ts`.
- [x] 11.2 Scheduler enqueues `retention-archive` jobs daily at 03:00 (cron `0 0 3 * * *`) — one job per enabled `DataRetentionPolicy`.
- [x] 11.3 Worker per policy: compute window; stream-query source table; write JSONL+gzip to `apps/api/archives/<batchId>.jsonl.gz`; verify sha256; persist `DataArchiveBatch` + `DataArchiveObject`; delete archived rows in batches of 1000; persist `DataCleanupRun`.
- [x] 11.4 Handle `action='KEEP'` as no-op for delete step.
- [x] 11.5 Manual trigger endpoint: `POST /api/admin/data-retention-policies/:id/run-now` enqueues immediate job.
- [x] 11.6 Admin endpoints for policy CRUD: `/api/admin/data-retention-policies` list/get/create/update/enable/disable.

## 12. REVIEW_REQUIRED workflow

- [x] 12.1 In `ChallengesService.finish`, after adapter call and `AttemptValidationReport` insert, branch:
  - If suspicious: CAS to `REVIEW_REQUIRED`, INSERT `AdminReviewTask(status='DRAFT', resourceType='GameAttempt', resourceId=attemptId, action='REVIEW_ATTEMPT', requestPayload={antiCheatFlags, suspiciousReason}, requestedByUserId=<system user>)`.
  - Else: continue COMPLETED + recordScores (Change 5 behaviour).
- [x] 12.2 Create `apps/api/src/admin/admin-review-tasks.controller.ts` + service:
  - `GET /api/admin/review-tasks?status=&page=&pageSize=`
  - `GET /api/admin/review-tasks/:id`
  - `POST /api/admin/review-tasks/:id/decide { decision, reviewComment }`
- [x] 12.3 Decide logic per design D6.
- [x] 12.4 Create system user `system@brain-games.internal` in seed and resolve its ID at service init (or use a sentinel; document choice).

## 13. PgBouncer + docker-compose

- [x] 13.1 Add `pgbouncer` service to `docker-compose.yml` (image `edoburu/pgbouncer:latest`); env `DB_HOST=postgres`, `DB_USER=postgres`, `DB_PASSWORD=postgres`, `POOL_MODE=transaction`, `MAX_CLIENT_CONN=200`, `DEFAULT_POOL_SIZE=25`.
- [x] 13.2 Update API `.env`: `DATABASE_URL=postgresql://postgres:postgres@localhost:6432/brain_games?pgbouncer=true&connection_limit=1` for runtime; `DATABASE_URL_DIRECT=postgresql://postgres:postgres@localhost:5432/brain_games` for migrations.
- [x] 13.3 Update `package.json` prisma scripts to pass `--db-url $DATABASE_URL_DIRECT` for `migrate dev/deploy/reset`.
- [x] 13.4 Add optional `api-workers` service to docker-compose that reuses the api image with `command: pnpm start:workers`.

## 14. Health endpoints

- [x] 14.1 Add `@nestjs/terminus`.
- [x] 14.2 Create `apps/api/src/health/health.module.ts` + `health.controller.ts` with `/api/healthz` and `/api/readyz`.
- [x] 14.3 Readiness checks: `prisma.$queryRaw\`SELECT 1\``, `redis.ping()`, each queue's `getJobCounts()` (or `isReady()`).

## 15. Throttler Redis storage

- [x] 15.1 Swap in-memory throttler storage from Change 2 with Redis-backed storage.
- [x] 15.2 Verify login rate limit applies across two simulated instances.

## 16. Admin SPA — review tasks UI

- [x] 16.1 Create `apps/admin/src/features/review-tasks/api/review-task-api.ts`.
- [x] 16.2 Create `ReviewTaskList.tsx` (filter by status, columns: attemptId, gameSlug, antiCheatFlags, createdAt).
- [x] 16.3 Create `ReviewTaskDetail.tsx` showing attempt summary, validation report, final-state preview, REVOKED/ADMIN_CORRECTED buttons with a comment textarea.
- [x] 16.4 Add route `apps/admin/src/app/routes/review-tasks.tsx` and `review-task-detail.tsx`.
- [x] 16.5 Add nav item in `AdminSidebar.tsx`.

## 17. Admin SPA — retention policy UI

- [x] 17.1 Create `apps/admin/src/features/retention/` with `PolicyList.tsx` (table with run-now action), `PolicyEditor.tsx` (form for thresholds + action).
- [x] 17.2 Add route `/data-retention-policies`.
- [x] 17.3 Add nav item.

## 18. start.sh updates

- [x] 18.1 After `pnpm dev`, ALSO spawn the workers entrypoint (`pnpm dev:workers`) or instruct user to run in another terminal.
- [x] 18.2 Add the workers service to `docker compose up` flow if using container deployment.

## 19. End-to-end smoke

- [x] 19.1 Boot api + workers + pgbouncer; verify `/api/healthz` and `/api/readyz` return 200.
- [x] 19.2 Replay an idempotent POST `/api/challenges/start` with the same `Idempotency-Key` → same response without duplicate row.
- [x] 19.3 Trigger suspicious finish (force antiCheatFlag in adapter for a test run) → AdminReviewTask appears; admin decides ADMIN_CORRECTED → score recorded on leaderboard.
- [x] 19.4 Kill the API process mid-attempt; reaper transitions stale attempt to INTERRUPTED within 30s.
- [x] 19.5 Stop Redis container; `/api/readyz` returns 503.
- [x] 19.6 Run `RetentionArchiveWorker` manually with a low onlineRetentionDays for `IdempotencyRecord`; verify archive file produced and source rows deleted.
- [x] 19.7 Confirm `@nestjs/throttler` Redis storage blocks 6th login from a second instance.

## 20. Documentation

- [x] 20.1 Create `docs/Overview-Concurrency.md` covering: process layout (api vs workers), queue table, redis lock keys, idempotency contract, dual-write heartbeat, REVIEW_REQUIRED flow diagram, retention worker, PgBouncer config, health endpoints.
- [x] 20.2 Update `docs/Overview-Framework.md` "过渡说明": mark Concurrency stream complete.
- [x] 20.3 Update `docs/Overview-Database.md` §7 (local reset) with the PgBouncer-aware commands.

## 21. Handoff to Change 7

- [x] 21.1 Confirm `IdempotencyInterceptor` applies to the upcoming `POST /api/challenges/:id/submissions` endpoint when Change 7 ships.
- [x] 21.2 Communicate: platform is now horizontally scalable; only remaining work is removing legacy game-specific endpoints (Change 7).
