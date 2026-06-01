# Proposal — harden-concurrency-stack

## Why

Changes 1–5 stood up the data model, RBAC, challenge runtime, catalog, and leaderboard pipeline using only the simplest concurrency primitives (`@nestjs/schedule` cron, DB CAS, in-memory debounce). Doc 9 (`docs/9-superbrain-concurrency-architecture.md`) calls for the full stack so the platform can scale beyond a single Node instance and handle hostile/bursty traffic:

- **Redis distributed locks** wrapping every high-contention CAS path (start, claim, finish) to reduce DB lock contention.
- **`IdempotencyRecord` table** as a request-level idempotency layer (currently only `GameAttempt.idempotencyKey` covers `/start`; the new layer covers heartbeat, abandon, finish, submissions, admin actions).
- **Heartbeat dual write** (PostgreSQL + Redis hash) so the reaper can scan Redis (cheap) and only touch PG when a transition is needed.
- **BullMQ** + 5 dedicated workers running as separate processes: `ChallengeReaperWorker`, `LeaderboardRefreshWorker`, `OperationLogFlushWorker`, `RetentionArchiveWorker`, `AuditLogWorker`.
- **PgBouncer** in `docker-compose.yml` so multiple API + worker instances share the small PG connection pool.
- **REVIEW_REQUIRED arbitration flow** end-to-end: anti-cheat flags or admin manual flag promote a `COMPLETED` attempt to `REVIEW_REQUIRED`, creating an `AdminReviewTask`; admin can `REVOKED` or `ADMIN_CORRECTED`.
- **DataRetentionPolicy enforcement**: `RetentionArchiveWorker` reads policies, computes due ranges, calls `DataArchiveBatch` + `DataArchiveObject` (JSONL+gzip to local disk for now), then `DataCleanupRun` deletes online rows.
- **`@nestjs/throttler` with Redis storage** so rate limits work across instances.
- Operational readiness: `/api/healthz` and `/api/readyz` endpoints checking PG + Redis + queue connectivity.

This is the change that turns the platform from "works on one laptop" into "ready for horizontal scale".

## What Changes

- Add `bullmq` and `@nestjs/bullmq` (or `nest-commander` worker style) dependencies. Configure `RedisModule` to also expose a BullMQ-compatible connection.
- Create `apps/api/src/workers/` directory with a Nest sub-application factory so workers run as `apps/api/src/main.workers.ts` separate from `main.ts`. Same image, different entrypoint.
- Add `apps/api/src/queues/` with `queue-names.ts`, `queues.module.ts` registering all 5 BullMQ queues, retry policy, dead-letter queue configuration.
- Migrate `ChallengeReaperWorker` (Change 3) and `LeaderboardRefreshWorker` (Change 5) from `@nestjs/schedule` to BullMQ:
  - A small `Scheduler` process enqueues jobs at fixed intervals (`repeat: { every: 30_000 }`).
  - Worker processes consume jobs.
- Add `OperationLogFlushWorker`: drains a BullMQ queue of `AttemptOperationLog` insert batches (writes coalesced from API requests when `OperationLogMode = BATCHED` or `FULL`).
- Add `RetentionArchiveWorker`: scans `DataRetentionPolicy`, computes time windows, creates `DataArchiveBatch` + writes JSONL+gzip files to `apps/api/archives/<storageKey>`, persists `DataArchiveObject`, then deletes archived rows in batches.
- Add `AuditLogWorker`: drains a queue of `AdminAuditLog` insert events so admin actions return without waiting for DB write.
- Add `RedisLockService` (wraps `redlock`-style algorithm using `SET key value NX PX ttl`); used in `ChallengesService.start/claim/finish` to serialize per-user / per-attempt critical sections.
- Add `IdempotencyInterceptor` (NestJS interceptor) that reads `Idempotency-Key` header on mutating requests, looks up `IdempotencyRecord`, returns cached response on hit, marks PROCESSING then writes the response on miss.
- Wire `ChallengeHeartbeatService` to write `lastHeartbeatAt` to BOTH PG and `redis HSET attempt:<id> hb <ts>` (TTL 60s). Reaper scans Redis for stale-or-missing keys, then double-checks PG before transitioning.
- Implement REVIEW_REQUIRED workflow:
  - `AttemptValidationReport.antiCheatFlags.length > 0 || metrics.suspiciousPath` → `ChallengesService` transitions `COMPLETED → REVIEW_REQUIRED` instead of recording scores; creates `AdminReviewTask`.
  - Admin endpoint `POST /api/admin/review-tasks/:id/decide { decision: 'REVOKED' | 'ADMIN_CORRECTED', reviewComment }` applies the final transition and either deletes the score (REVOKED) or accepts it (ADMIN_CORRECTED → ScoreRecordingService runs).
- Implement DataRetentionPolicy enforcement worker; document storage paths.
- Update `docker-compose.yml`: add `pgbouncer` service in front of `postgres`; switch `DATABASE_URL` to point at PgBouncer in transaction mode; document `DATABASE_URL_DIRECT` for migrations.
- Update `start.sh` to start workers alongside API in dev (background process or separate `docker-compose` service).
- Add `/api/healthz` (liveness) and `/api/readyz` (readiness, checks PG via `SELECT 1`, Redis ping, BullMQ queue ready).
- Add `@nestjs/throttler` Redis storage replacing the in-memory storage from Change 2.
- Update Admin SPA to add a "Review tasks" page under `/review-tasks` showing pending REVIEW_REQUIRED attempts with diff vs reference, accept/revoke buttons.

## Capabilities

### New Capabilities

- `concurrency-runtime`: Distributed locks, idempotency middleware, dual-write heartbeat, BullMQ workers, scheduler, dead-letter handling.
- `arbitration`: REVIEW_REQUIRED flow, AdminReviewTask CRUD, admin decide endpoint, admin review UI.
- `data-lifecycle-runtime`: RetentionArchiveWorker, archive object writer, cleanup runner, retention policy admin endpoints.

### Modified Capabilities

- `challenges`: `finish` now routes to `REVIEW_REQUIRED` on flagged validations; heartbeat dual-writes; start/claim/finish wrapped by Redis lock; `IdempotencyInterceptor` applies to all mutating endpoints.
- `leaderboard-pipeline`: `LeaderboardRefreshWorker` migrated from `@nestjs/schedule` to BullMQ; score recording becomes asynchronous for high-throughput boards (configurable per policy).
- `auth`: `@nestjs/throttler` now uses Redis storage (login limit becomes cross-instance).

## Impact

- `apps/api/package.json` — add `bullmq`, `@nestjs/bullmq`, `redlock` (or hand-rolled), `@nestjs/terminus`, throttler-redis storage.
- `apps/api/src/queues/*` (new).
- `apps/api/src/workers/*` (new, including a separate `main.workers.ts`).
- `apps/api/src/common/redis-lock.service.ts` (new).
- `apps/api/src/common/idempotency/*` (new: interceptor + service + decorator).
- `apps/api/src/challenges/*` (extend: lock wrappers, dual-write heartbeat, REVIEW_REQUIRED branch).
- `apps/api/src/leaderboards/*` (migrate scheduled worker to BullMQ).
- `apps/api/src/admin/admin-review-tasks.{controller,service}.ts` (new).
- `apps/api/src/health/health.module.ts` (new).
- `apps/api/src/main.ts` — add health endpoints, wire throttler Redis storage.
- `apps/api/src/main.workers.ts` (new).
- `docker-compose.yml` — add `pgbouncer` service, optional `api-workers` service.
- `start.sh` — start workers process.
- `apps/api/.env.example` — add `DATABASE_URL_DIRECT`, `REDIS_URL_QUEUES` (or reuse), `WORKER_INSTANCE_COUNT`.
- `apps/admin/src/features/review-tasks/*` (new).
- `apps/admin/src/app/routes/review-tasks.tsx` (new).
- `docs/Overview-Concurrency.md` (new).

**Out of scope**: object-storage (S3/MinIO) for archive output — local disk only; Prometheus/Grafana wiring (just a stretch). Front-end perf optimisation. Per-game tuning of policy parameters beyond defaults.
