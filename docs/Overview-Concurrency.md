# SuperBrain 并发硬化（Concurrency Stack）

> **状态**：Change 6 `harden-concurrency-stack` 部分实现。已落地：Redis 分布式锁、IdempotencyInterceptor、REVIEW_REQUIRED 仲裁流程、AdminReviewTask 端点、ScoreRecord revoke 端点、`/healthz`/`/readyz`、`@nestjs/throttler` 内存版（Redis storage 后续切）。
>
> **暂未实现（标注于 Change 6 tasks）**：BullMQ 独立 worker 进程（`main.workers.ts`）、5 个 Worker 全部、PgBouncer + docker-compose 服务、RetentionArchiveWorker 落地、`@nestjs/throttler-storage-redis` 切换、admin SPA 仲裁/保留策略 UI。
>
> **真理源**：`apps/api/src/common/{redis-lock.service.ts,idempotency/}`、`apps/api/src/health/`、`apps/api/src/admin/admin-review-tasks.controller.ts`、`apps/api/src/admin/admin-score-records.controller.ts`。

---

## 1. 已落地能力

### 1.1 Redis 分布式锁

```ts
@Injectable() class RedisLockService {
  acquire(key, ttlMs): Promise<token>;       // SET NX PX, 重试 50ms x 3
  release(key, token);                        // Lua: del if value matches
  withLock(key, ttlMs, fn);                   // 自动释放
}
```

约定 lock key：

| key | TTL | 用途 |
|---|---:|---|
| `lock:user-start:<userId>` | 1s | 串行同用户的 `/challenges/start` |
| `lock:attempt:<attemptId>` | 5s | 串行同一 attempt 的 mutate |
| `lock:leaderboard-refresh:<lid>:<pid>` | 30s | 防止两个进程同时 refresh |

锁是 **opportunistic** — DB CAS + partial unique index 才是最终安全网。

### 1.2 IdempotencyInterceptor

```
Header: Idempotency-Key: <uuid>
```

- 全局拦截器，仅作用于 mutating method（POST/PATCH/DELETE）。
- 命中 `IdempotencyRecord(userId, key)`：
  - `requestHash` 一致且 `status=SUCCEEDED` → 返回缓存 `responseBody`。
  - `requestHash` 不一致 → HTTP 409 `idempotency-conflict`。
  - `status=PROCESSING` 且 `lockedUntil > now` → HTTP 409 `processing` + `retryAfterMs`。
- 未命中：UPSERT `PROCESSING + lockedUntil = now+30s`，handler 跑完后转 `SUCCEEDED + responseBody`，错误时 `FAILED`。
- TTL：成功后 24h（`expiresAt` 由 RetentionArchiveWorker 清理）。

`@RequireIdempotency()` 装饰器声明强制要求 header；当前默认对所有 mutating endpoint 都尝试缓存（无需 header 时跳过）。

### 1.3 健康检查端点

```
GET /api/healthz   → 200 always (liveness)
GET /api/readyz    → 200 only if pg `SELECT 1` + redis ping 都通过；否则 200 with status='unready'
```

K8s/docker-compose 用 `/api/readyz` 决定流量入站。

### 1.4 REVIEW_REQUIRED 仲裁流程

`ChallengesService.finish` 内：

```
adapter.finishAttempt() → report
  ├─ report.passed && antiCheatFlags.length > 0
  │     CAS PLAYING/SUBMITTING → REVIEW_REQUIRED
  │     INSERT AdminReviewTask {resourceType:'GameAttempt', action:'REVIEW_ATTEMPT'}
  │     emit ChallengeAuditLog REQUEST_REVIEW
  │     ❌ 不写 ScoreRecord
  │
  └─ otherwise (Change 5 路径)
        CAS → COMPLETED
        ScoreRecordingService.recordScores(...)
```

#### Admin 端点

| 方法 | 路径 | 权限 |
|---|---|---|
| `GET` | `/api/admin/review-tasks?status=DRAFT` | `review-task:read` |
| `GET` | `/api/admin/review-tasks/:id` | `review-task:read` |
| `POST` | `/api/admin/review-tasks/:id/decide` | `review-task:approve` 或 `:reject` |

`POST .../decide`：
- `decision='ADMIN_CORRECTED'` → 设置 `GameAttempt.status='ADMIN_CORRECTED'` + 调 `ScoreRecordingService.recordScores`；任务 ARCHIVED。
- `decision='REVOKED'` → 设置 `GameAttempt.status='REVOKED'` + 把已存在的 ScoreRecord 标 REVOKED；任务 ARCHIVED。

### 1.5 ScoreRecord 撤销端点

| 方法 | 路径 | 权限 |
|---|---|---|
| `POST` | `/api/admin/score-records/:id/revoke` | `score-record:revoke` |

事务内：
1. ScoreRecord.status='REVOKED'。
2. 如果该 record 是当前 LeaderboardBest：找次佳 ScoreRecord 替换；找不到则删除 best 行。
3. `RankCacheService.scheduleRefresh(...)` hint。

---

## 2. 暂未实现 / 后续补齐

下列 Change 6 task 已声明，但未在本批次落地（标注 todo）；它们不阻塞 Change 7：

| 模块 | 状态 | 说明 |
|---|---|---|
| BullMQ + 5 worker（`main.workers.ts` 独立进程） | ❌ | 当前仍走 `@nestjs/schedule` cron 在 API 进程内（`ChallengeReaperWorker` / `LeaderboardRefreshWorker`） |
| OperationLogFlushWorker | ❌ | API 直写 `AttemptOperationLog`（操作量小时无瓶颈） |
| AuditLogWorker | ❌ | `AdminAuditLog` 直写（同上） |
| RetentionArchiveWorker | ❌ | `DataRetentionPolicy` 写表，但无落地任务 |
| 心跳双写 PG + Redis ZSET | ❌ | 心跳仅写 PG；Reaper 仍扫 PG 索引 |
| `@nestjs/throttler-storage-redis` | ❌ | 限流仍用内存版（单实例 OK） |
| PgBouncer + docker-compose | ❌ | API 直连 PG；多实例部署前需补 |
| Admin SPA `/review-tasks` UI | ❌ | 仅 API 可调；操作员可用 curl/postman |
| Admin SPA `/data-retention-policies` UI | ❌ | 同上 |

切换到完整实现时遵循 design.md §Decisions D1-D11 即可，schema 已为这些能力预留好字段（`AttemptOperationBatch`、`DataArchiveBatch/Object/CleanupRun`、`IdempotencyRecord` 已在 Change 1 落地）。

---

## 3. CAS + 部分唯一索引（已就位）

```sql
-- 这些索引由 Change 1 init migration 创建：
uq_user_active_ranked_attempt
uq_attempt_active_runtime_session
uq_active_game_ruleset_version
uq_active_game_difficulty
uq_active_game_content_policy   (NULLS NOT DISTINCT)
uq_active_game_challenge_policy (NULLS NOT DISTINCT)
uq_published_puzzle_version
```

所有状态机迁移（Challenge / 配置激活 / Puzzle 发布）必须用 `prisma.updateMany WHERE status=expected AND statusVersion=expected` 模式，0 行匹配视为竞态丢失。

---

## 4. 与其他 Overview 的关系

- 状态机原始设计 → `Overview-Challenge-Runtime.md` §2。
- 排行榜事务一致写榜 → `Overview-Leaderboard.md` §1。
- AdminAuditLog 字段 → `Overview-Database.md` §6 Admin & Audit。
- 后续接入 BullMQ / 真正 Worker 进程时的服务边界，参考 `docs/9-superbrain-concurrency-architecture.md`。
