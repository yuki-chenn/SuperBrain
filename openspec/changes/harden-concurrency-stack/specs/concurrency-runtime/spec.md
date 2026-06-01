# concurrency-runtime Capability (delta for change `harden-concurrency-stack`)

## ADDED Requirements

### Requirement: Two-process deployment

The system SHALL support running API and worker processes from the same image with different entrypoints (`main.ts` for HTTP, `main.workers.ts` for BullMQ processors + scheduler). Both processes SHALL load `QueuesModule` so they share queue definitions, but only the worker process SHALL register processors.

#### Scenario: API process does not process jobs
- **WHEN** only `main.ts` is running
- **THEN** jobs enqueued to any BullMQ queue accumulate without being consumed

#### Scenario: Worker process consumes jobs
- **WHEN** `main.workers.ts` is also running
- **THEN** enqueued jobs are processed within their backoff schedule

### Requirement: Redis distributed lock service

The system SHALL provide `RedisLockService.withLock(key, ttlMs, fn)` that acquires a Redis `SET NX PX` lock, runs the function, and releases via a value-matching Lua script.

#### Scenario: Concurrent locks serialise
- **GIVEN** two requests try to acquire `lock:user-start:U` simultaneously
- **THEN** one acquires first, the other retries (50ms ×3) then either succeeds after the first releases OR throws `LockBusyError`

#### Scenario: Crashed holder eventually releases
- **GIVEN** a holder crashed before releasing
- **WHEN** the TTL expires
- **THEN** another acquirer succeeds

### Requirement: IdempotencyRecord interceptor

The system SHALL apply `IdempotencyInterceptor` to every mutating endpoint (POST/PATCH/DELETE) marked with `@RequireIdempotency()` (and also automatically to all `/api/challenges/*` and `/api/admin/*` mutating routes). On `Idempotency-Key` header presence the interceptor SHALL:
- Return cached response on duplicate matching hash.
- Return HTTP 409 `idempotency-conflict` on duplicate key with different request hash.
- Return HTTP 409 `processing` on in-flight duplicate (locked status).
- Persist the response after successful handling.

#### Scenario: Cached replay
- **GIVEN** a POST `/api/challenges/start` with `Idempotency-Key: K` returned 200 with body B
- **WHEN** the same user replays the request with the same key and same body
- **THEN** the API returns the SAME body B without calling the handler

#### Scenario: Conflicting payload
- **WHEN** the same user replays with `Idempotency-Key: K` but a DIFFERENT body
- **THEN** the API returns HTTP 409 with body `{ error: 'idempotency-conflict' }`

#### Scenario: Concurrent in-flight
- **GIVEN** a POST is currently PROCESSING with key K (lockedUntil > now)
- **WHEN** the same user retries the same key
- **THEN** the API returns HTTP 409 with body `{ error: 'processing', retryAfterMs }`

### Requirement: Heartbeat dual-write (PostgreSQL + Redis)

`POST /api/challenges/:id/heartbeat` SHALL write the heartbeat timestamp to both the `GameAttempt.lastHeartbeatAt` column (PG) AND a Redis sorted set `attempts-by-hb` (member = attemptId, score = unix ms). The Redis write SHALL use a pipeline alongside the PG transaction.

#### Scenario: Both stores updated
- **WHEN** the SPA sends heartbeat
- **THEN** PG's `lastHeartbeatAt` is updated
- **AND** Redis `ZSCORE attempts-by-hb <attemptId>` returns a timestamp within ±1s of `now`

### Requirement: ChallengeReaperWorker uses Redis scan

The `ChallengeReaperWorker` (BullMQ processor for queue `challenge-reaper`) SHALL primarily scan `attempts-by-hb` via `ZRANGEBYSCORE` for entries older than `now - heartbeatTimeoutSec`, then verify each against PG via SELECT FOR UPDATE before CAS-transitioning to `INTERRUPTED`. For attempts past `expiresAt` (a separate scan) the reaper SHALL CAS to `TIMEOUT`.

#### Scenario: Stale heartbeat triggers INTERRUPTED
- **GIVEN** an attempt with `status=PLAYING` and Redis hb score < `now - 15s` (default heartbeatTimeoutSec)
- **WHEN** the reaper job runs
- **THEN** the attempt is CAS-transitioned to `INTERRUPTED` with reason `reaper-heartbeat-stale`

#### Scenario: Expired attempt triggers TIMEOUT
- **GIVEN** `attempt.expiresAt < now`
- **WHEN** the reaper job runs
- **THEN** the attempt is CAS-transitioned to `TIMEOUT`

### Requirement: BullMQ queues registered

The system SHALL register five queues in `QueuesModule`: `challenge-reaper`, `leaderboard-refresh`, `operation-log-flush`, `retention-archive`, `audit-log`. Each queue SHALL have `attempts: 3`, exponential backoff, and `removeOnComplete: { age: 3600 }`.

#### Scenario: Queues are discoverable
- **WHEN** an admin queries the BullMQ board (if exposed) or calls `getQueueByName`
- **THEN** all five queue names exist and report `isReady() = true`

### Requirement: Health and readiness endpoints

The system SHALL expose `GET /api/healthz` (always 200 if process is alive) and `GET /api/readyz` (200 only if PG `SELECT 1`, Redis `PING`, and each registered BullMQ queue `isReady()` succeed; else 503).

#### Scenario: Liveness while DB down
- **GIVEN** PostgreSQL is unreachable
- **WHEN** a client GETs `/api/healthz`
- **THEN** the response is HTTP 200
- **AND** the same client GETs `/api/readyz` → HTTP 503 with details

### Requirement: Throttler uses Redis storage

The login throttle (5/minute/IP from Change 2) SHALL be backed by Redis so the limit applies across all API instances.

#### Scenario: Cross-instance limit
- **GIVEN** two API instances behind a load balancer
- **WHEN** 6 login attempts hit either or both instances within 60s
- **THEN** the 6th is HTTP 429
