# leaderboard-pipeline Capability (delta for change `harden-concurrency-stack`)

## MODIFIED Requirements

### Requirement: LeaderboardRefreshWorker schedule

A BullMQ worker (queue `leaderboard-refresh`) SHALL run every 60 seconds (cron-enqueued) and on-write debounced (5s) per `(leaderboardId, periodId)`. Each refresh SHALL be wrapped in a Redis lock `lock:leaderboard-refresh:<leaderboardId>:<periodId>` so only one process refreshes a given board+period at a time.

#### Scenario: Worker picks up writes (unchanged)
- **GIVEN** a score was inserted at T0 and last cache refresh was at T0 - 30s
- **WHEN** the worker next runs (T0 + ≤60s)
- **THEN** the cache is refreshed and `generatedAt > T0`

#### Scenario: Two workers do not double-refresh
- **GIVEN** two worker instances run
- **WHEN** both pick the same `(leaderboardId, periodId)` job
- **THEN** only one acquires the Redis lock; the other no-ops and re-checks staleness
