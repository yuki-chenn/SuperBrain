# Design — harden-concurrency-stack

## Context

After Change 5 the platform works end-to-end on a single Node process. Doc 9 sets the bar higher: multi-instance API, dedicated worker processes, Redis-backed coordination, full idempotency, arbitration workflow, retention enforcement. This change implements the missing operational surfaces.

## Goals / Non-Goals

**Goals**
- Two process roles: `api` and `workers`. Both built from the same image; entrypoint differs.
- All scheduled work (reaper, leaderboard refresh, op-log flush, retention archive, audit log) runs in BullMQ-backed workers.
- Redis distributed lock wraps high-contention CAS paths (`start`, `claim`, `finish`).
- `IdempotencyRecord` interceptor protects every mutating endpoint.
- Heartbeat dual-write: PG (durable) + Redis hash (cheap reaper scan).
- REVIEW_REQUIRED arbitration: anti-cheat flags route to admin; admin decides REVOKED / ADMIN_CORRECTED.
- DataRetentionPolicy enforcement: archive + cleanup workers operate.
- PgBouncer in front of PG; API and workers share the pool.
- `/healthz` (liveness) + `/readyz` (readiness) endpoints.
- Throttler uses Redis storage (cross-instance limits).

**Non-Goals**
- No external object storage; archive output is local disk (`apps/api/archives/`). Future change can swap the backend.
- No metrics/observability stack (Prometheus/Grafana). Document the metric names workers SHOULD emit; actual scraping deferred.
- No K8s manifests; `docker-compose.yml` only.
- No multi-region replication or HA Postgres.

## Decisions

### D1 — Two-process deployment

`apps/api/src/main.ts` boots `AppModule` (HTTP only). `apps/api/src/main.workers.ts` boots `WorkersModule` (BullMQ processors + scheduler). Both reuse `PrismaModule + RedisModule + QueuesModule`. A new package script `pnpm dev:workers` runs the workers entrypoint via nodemon. `docker-compose.yml` adds an `api-workers` service that reuses the api image.

### D2 — BullMQ queues

Five queues, all in Redis db 0:

| Queue | Producer | Consumer |
|---|---|---|
| `challenge-reaper` | scheduler (cron 30s) | `ChallengeReaperWorker` |
| `leaderboard-refresh` | scheduler (cron 60s) + on-score-write hint | `LeaderboardRefreshWorker` |
| `operation-log-flush` | API request handlers (when `OperationLogMode = BATCHED/FULL`) | `OperationLogFlushWorker` |
| `retention-archive` | scheduler (cron daily 03:00) | `RetentionArchiveWorker` |
| `audit-log` | every admin mutation (via `AuditLogProducer`) | `AuditLogWorker` |

Each queue has `removeOnComplete: { age: 3600 }`, `attempts: 3`, exponential backoff. Failed jobs move to `<queue>:failed` (BullMQ default DLQ semantics).

### D3 — Redis lock

`RedisLockService.withLock(key, ttlMs, fn)`:
- `SET lock:<key> <uuid> NX PX <ttlMs>` — acquired if OK.
- Run `fn()`.
- Release via Lua script that DEL's only if value matches uuid.
- On contention, retries: 50ms × 3 then gives up with `LockBusyError`.

Lock keys:
- `lock:user-start:<userId>` — serialise concurrent `/start` per user (1s TTL).
- `lock:attempt:<attemptId>` — serialise concurrent mutating ops on one attempt (5s TTL).
- `lock:leaderboard-refresh:<leaderboardId>:<periodId>` — single refresh at a time.

Locks are **opportunistic**: the DB CAS / partial unique index is still the authoritative safety net. Locks just reduce noise.

### D4 — IdempotencyRecord interceptor

`IdempotencyInterceptor` runs before the handler:

1. If request method is GET, skip.
2. Read `Idempotency-Key` header (or fallback to `idempotencyKey` body field). If absent and endpoint marked `@RequireIdempotency`, return 400.
3. Compute `requestHash = sha256(method + path + bodyHash + userId)`.
4. UPSERT `IdempotencyRecord(userId, key)`:
   - If exists with `status=SUCCEEDED` and `requestHash` matches: return cached `responseBody`.
   - If exists with `status=SUCCEEDED` and `requestHash` differs: 409 `idempotency-conflict`.
   - If exists with `status=PROCESSING` and `lockedUntil > now`: 409 `processing` (client should retry after delay).
   - Else: mark `PROCESSING`, `lockedUntil = now + 30s`, continue.
5. After handler returns, persist `status=SUCCEEDED`, `responseBody`, `resourceType`, `resourceId`, `expiresAt = now + 24h`. On error: `status=FAILED`.

Decorator `@RequireIdempotency()` marks endpoints that MUST have the header. The challenge endpoints (start/claim/heartbeat/abandon/finish), the leaderboard revoke, and admin mutating actions get the decorator.

### D5 — Dual-write heartbeat

`POST /api/challenges/:id/heartbeat` now:
1. `pipeline.HSET(`attempt:${attemptId}`, 'hb', now, 'phase', phase, 'playSessionId', playSessionId).EXPIRE 60`.
2. UPDATE `AttemptRuntimeSession.lastHeartbeatAt + GameAttempt.lastHeartbeatAt`.
3. (3-5 as before for TIMEOUT / CLAIMED → PLAYING.)

Reaper scans Redis: `KEYS attempt:*` (or maintain a `ZSET attempts-by-hb` sorted by ts for efficiency). For each attempt with `hb < now - heartbeatTimeoutSec` OR missing key but `GameAttempt.status IN (PLAYING, SUBMITTING)`, CAS to `INTERRUPTED`.

The `ZSET` index `attempts-by-hb` is populated by heartbeat (`ZADD attempts-by-hb <ts> <attemptId>`); reaper uses `ZRANGEBYSCORE attempts-by-hb -inf <now - heartbeatTimeoutSec>`.

### D6 — REVIEW_REQUIRED workflow

`ScoreRecordingService.recordScores` (from Change 5) is now preceded by a gate:

```
if (validationReport.antiCheatFlags.length > 0 ||
    (challengePolicy.requiresReviewOnSuspicion && metrics.suspicious === true)) {
  // Promote to REVIEW_REQUIRED instead of writing scores
  await prisma.gameAttempt.update({ where: { id }, data: { status: 'REVIEW_REQUIRED' } });
  await prisma.adminReviewTask.create({
    data: {
      resourceType: 'GameAttempt', resourceId: attemptId, action: 'REVIEW_ATTEMPT',
      requestPayload: { antiCheatFlags, suspiciousReason },
      requestedByUserId: SYSTEM_USER_ID,  // or null with a marker
      status: 'DRAFT',
    },
  });
  return { reviewRequired: true };
}
```

Admin decide endpoint:
```
POST /api/admin/review-tasks/:id/decide { decision, reviewComment }
```
- `REVOKED` → set GameAttempt.status=REVOKED, AdminReviewTask.status=ARCHIVED, audit row.
- `ADMIN_CORRECTED` → set GameAttempt.status=ADMIN_CORRECTED; call `ScoreRecordingService.recordScores` (now allowed); AdminReviewTask.status=ARCHIVED; audit row.

### D7 — RetentionArchiveWorker

Cron daily 03:00 (configurable). For each `DataRetentionPolicy(enabled=true)`:

1. Compute archive window: `[oldestUnarchived, now - onlineRetentionDays]`.
2. Skip if window is empty.
3. INSERT `DataArchiveBatch(status=RUNNING)`.
4. Stream-query the source table by `(createdAt BETWEEN startTs AND endTs)`, write `JSONL.gz` to `apps/api/archives/<batchId>.jsonl.gz`.
5. Compute sha256 + size; INSERT `DataArchiveObject` with `storageKey, sizeBytes, sha256`.
6. INSERT `DataCleanupRun(status=RUNNING, action=DELETE)`.
7. DELETE source rows in batches of 1000 with `LIMIT` (or with `WITH ... DELETE ... RETURNING`).
8. Update batch + run rows to `COMPLETED`.

Hard guard: `AdminAuditLog` policy is `KEEP` (never deleted by this worker, only archived).

### D8 — Admin review UI

`apps/admin/src/features/review-tasks/`:
- `ReviewTaskList.tsx` — pending tasks ordered by `createdAt ASC`.
- `ReviewTaskDetail.tsx` — shows `GameAttempt` summary, `AttemptValidationReport.antiCheatFlags`, validator output, raw final state; offers REVOKED / ADMIN_CORRECTED buttons with a free-text reviewComment.

### D9 — PgBouncer in docker-compose

- New service `pgbouncer` (image `edoburu/pgbouncer:latest`).
- `databases.brain_games` points at `postgres:5432`.
- `pool_mode = transaction`, `max_client_conn = 200`, `default_pool_size = 25`.
- API + workers use `DATABASE_URL=postgresql://postgres:postgres@pgbouncer:6432/brain_games`.
- Prisma migrations require direct connection (PgBouncer transaction mode is incompatible with prepared statements + DDL). Add `DATABASE_URL_DIRECT=postgresql://postgres:postgres@postgres:5432/brain_games` and expose via `prisma migrate dev` command line `--db-url $DATABASE_URL_DIRECT`.

### D10 — Health endpoints

`@nestjs/terminus` exposes:
- `GET /api/healthz` → 200 if process is alive.
- `GET /api/readyz` → 200 only if PG (`SELECT 1`), Redis (PING), and each BullMQ queue (`isReady()`) succeed.

K8s/docker-compose health checks use `readyz` for traffic routing.

### D11 — Throttler with Redis storage

Replace in-memory throttler from Change 2 with a Redis-backed one (`@nestjs/throttler` v5 supports custom storage). Login endpoint becomes `5/minute/IP` across all API instances.

## Risks / Trade-offs

- **[Risk]** PgBouncer transaction mode incompatible with prepared statements. → **Mitigation**: Prisma uses `connection_limit=1` style + `pgbouncer=true` query string; consult Prisma docs.
- **[Risk]** Distributed lock could be acquired then process dies mid-operation, holding lock until TTL. → **Mitigation**: short TTLs (1-5s); CAS in DB is still the safety net.
- **[Risk]** BullMQ workers can crash on bad job payloads. → **Mitigation**: job-level try/catch; `attempts: 3`; failed jobs in DLQ; alerts via log monitor.
- **[Risk]** Archive worker deleting before download verification could lose data. → **Mitigation**: archive step writes file + verifies sha256 BEFORE delete step; delete is in same `DataCleanupRun` row with rollback on partial fail.
- **[Trade-off]** Two-process deployment increases ops complexity. → **Accepted**; standard for non-trivial Node apps.
- **[Trade-off]** Redis becomes load-bearing for heartbeat. → **Accepted**; PG is still the durability source (dual write).

## Migration Plan

1. Add dependencies (`bullmq`, `@nestjs/bullmq`, `@nestjs/terminus`, throttler Redis storage).
2. Add `QueuesModule` registering all 5 queues.
3. Add `RedisLockService` + tests.
4. Add `IdempotencyInterceptor` + decorator; wire globally for mutating endpoints; verify start/claim/etc remain idempotent.
5. Migrate `ChallengeReaperWorker` + `LeaderboardRefreshWorker` to BullMQ; add scheduler.
6. Add `OperationLogFlushWorker` + producer hook from API request handlers.
7. Add `RetentionArchiveWorker` + integration tests against in-memory PG.
8. Add `AuditLogWorker` + producer.
9. Add dual-write heartbeat path.
10. Implement REVIEW_REQUIRED workflow + admin endpoints + SPA pages.
11. Update `docker-compose.yml` to add `pgbouncer` and optional `api-workers`.
12. Add `main.workers.ts` and `pnpm dev:workers` script.
13. Add `/healthz` + `/readyz` endpoints.
14. Switch throttler to Redis storage.
15. Update `start.sh` to start workers process.
16. End-to-end smoke: trigger antiCheatFlag → attempt becomes REVIEW_REQUIRED, AdminReviewTask appears, admin decides ADMIN_CORRECTED → score appears on board; trigger TIMEOUT via reaper; archive worker drains old AttemptOperationLog rows.

**Rollback**: revert commits; PgBouncer removal requires updating connection strings.

**Verification gate**:
- Workers process boots and registers all 5 BullMQ processors.
- Heartbeat populates Redis ZSET; reaper transitions stale attempts based on Redis scan.
- IdempotencyInterceptor replays cached response on duplicate header.
- REVIEW_REQUIRED flow round-trips end-to-end including admin SPA UI.
- RetentionArchiveWorker produces a JSONL.gz archive for old `IdempotencyRecord` rows after configured TTL.
- `/readyz` returns 503 if Redis is stopped.

## Open Questions

1. How fine-grained should the heartbeat ZSET be — one per attempt or sharded? **Adopted**: single ZSET initially; shard if it exceeds 100k members.
2. Should we add metrics emission (Prometheus client) now or defer? **Deferred**; mark hooks in the worker for future addition (`metrics.inc('challenges.reaped')`).
3. Should `AdminAuditLog` be queueed via `AuditLogWorker` ALWAYS or only when traffic is heavy? **Adopted**: always; in-process insert continues to be allowed for low-traffic startup tools but production paths go through the queue.
4. Admin review UI: support batch decisions? **Deferred**; one-at-a-time first.
