# SuperBrain 挑战运行时（Challenge Runtime）

> **状态**：Change 3 `introduce-challenge-runtime-gateway` 已完成。统一 `/api/challenges/*` 端点 + CAS 状态机 + 4 个游戏适配器 + 前端 Challenge Runtime Gateway 已就位。
> **真理源**：`apps/api/src/challenges/`、`apps/api/src/games/`、`apps/web/src/challenge/`。

---

## 1. 设计目标

```
1. /play 页面只展示游戏，不创建挑战。
2. 创建挑战只能通过 POST /api/challenges/start。
3. 进入 /play 必须携带 attemptId + entryToken，并通过服务端 claim 校验。
4. 浏览器 Back / Forward / Refresh / 直接输入 URL 都无法绕过 attempt 状态机。
5. 服务端 GameAttempt 状态是唯一权威；前端 Zustand 只持有本地 UI 状态。
6. 所有游戏通过统一 GameRuntimeAdapter 接入。
```

## 2. AttemptStatus 状态机（13 值）

```
                              ┌────────────┐
                  /start ────►│  CREATED   │
                              └─────┬──────┘
                          /claim    │
                              ┌─────▼──────┐
                              │  CLAIMED   │
                              └─────┬──────┘
                  heartbeat phase=playing
                              ┌─────▼──────┐
              ┌───── /abandon │  PLAYING   │ ───── /finish ────►┐
              │               └─────┬──────┘                     │
              │                     │ pause                      │
              │               ┌─────▼──────┐                     │
              │               │  PAUSED    │ resume → PLAYING    │
              │               └────────────┘                     ▼
              │                                          ┌──────────────┐
              │                                          │ SUBMITTING   │
              │                                          └──────┬───────┘
              ▼                                                  │
     ┌─────────────┐    reaper expires    ┌─────────────┐       │
     │  ABANDONED  │  ◄────/heartbeat────► │  TIMEOUT    │       ▼
     └─────────────┘                       └─────────────┘  ┌──────────┐
                          reaper heartbeat                  │ COMPLETED│
                          ┌─────────────┐                   └────┬─────┘
                          │ INTERRUPTED │                        │ admin flag
                          └─────────────┘                   ┌────▼─────────────┐
                                                            │ REVIEW_REQUIRED  │
                                                            └────┬───────┬─────┘
                                       admin REVOKE              │       │ admin ACCEPT
                                                            ┌────▼───┐  ┌▼─────────────┐
                                                            │REVOKED │  │ADMIN_CORRECTED│
                                                            └────────┘  └───────────────┘
```

终态：`COMPLETED · ABANDONED · TIMEOUT · INTERRUPTED · INVALIDATED · REVOKED · ADMIN_CORRECTED`。

每次合法迁移：CAS 条件更新 `WHERE id=? AND status=?`，成功后写 `ChallengeAuditLog`。`statusVersion` 自增。

## 3. 端点（统一 `/api/challenges`）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `POST` | `/api/challenges/start` | JWT | 创建 GameAttempt，返回 `entryToken`、`playSessionId`、`initialState`、`playPath` |
| `POST` | `/api/challenges/:id/claim` | JWT | CAS `CREATED→CLAIMED`，激活 AttemptRuntimeSession |
| `POST` | `/api/challenges/:id/heartbeat` | JWT | 心跳；`phase=playing` 时 CAS `CLAIMED→PLAYING`；过期触发 TIMEOUT |
| `POST` | `/api/challenges/:id/abandon` | JWT | 幂等 CAS → ABANDONED |
| `POST` | `/api/challenges/:id/finish` | JWT | CAS `PLAYING→SUBMITTING`，调适配器 `finishAttempt`，写 AttemptValidationReport，CAS → COMPLETED |
| `GET` | `/api/challenges/:id/status` | JWT | 当前状态 + resultPath/expiredPath 提示 |

## 4. 数据库不变量（来自 Change 1 的部分唯一索引）

| 索引 | 作用 |
|---|---|
| `uq_user_active_ranked_attempt` | 一个用户同一时间只能有一个活跃 RANKED/DAILY attempt |
| `uq_attempt_active_runtime_session` | 一个 attempt 同一时间只能有一个活跃 runtime session（防双标签页 claim） |

## 5. GameRuntimeAdapter 契约

```ts
interface GameRuntimeAdapter {
  engineKey: string;

  startAttempt(input): Promise<{
    seed?: string;
    initialState: unknown;
    contentResolvedType: 'GENERATED' | 'CURATED' | 'SCHEDULED' | 'MIXED';
    puzzleId?: string;
    puzzleVersionId?: string;
    generatedContentHash?: string;
    maxDurationMs: number;
  }>;

  finishAttempt(input): Promise<{
    passed: boolean;
    scoreValue?: number;
    durationMs?: number;
    metrics: Record<string, unknown>;
    antiCheatFlags: string[];
    validatorKey: string;
    validatorVersion?: string;
  }>;

  // 中间提交（life REGION / PCB ROUND / AC COMMAND）
  // Change 3 stub；Change 7 完整实现
  verifySubmission?(input): Promise<{
    accepted: boolean;
    reason?: string;
    result: Record<string, unknown>;
    metricsDelta?: Record<string, number>;
    snapshot?: { type: SnapshotType; state: unknown };
    finalReady?: boolean;
  }>;
}
```

注册：每个 adapter 在自己的 `onModuleInit` 中调用 `GameAdapterRegistry.register(this)`，按 `engineKey` 路由。

## 6. ChallengeReaperWorker（cron, 30s）

- 扫描 `(status, expiresAt)` 部分索引：CAS → TIMEOUT。
- 扫描 `(status, lastHeartbeatAt)`：CAS → INTERRUPTED（默认 15s 心跳超时）。
- 每次迁移写 ChallengeAuditLog `reason='reaper-expired'` / `'reaper-heartbeat-stale'`。
- Change 6 会把 worker 切换到 BullMQ 独立进程。

## 7. 前端 Challenge Runtime 层

```
apps/web/src/challenge/
├── core/
│   ├── challenge-types.ts            # ChallengePhase / ChallengeRuntimeState
│   ├── challenge-runtime-store.ts    # Zustand 本地 UI 状态
│   ├── challenge-navigation-manager.ts
│   ├── challenge-heartbeat.ts        # useChallengeHeartbeat(intervalSec)
│   ├── challenge-broadcast.ts        # BroadcastChannel 双标签页探测
│   └── challenge-errors.ts
├── api/
│   ├── challenge-api.ts              # /api/challenges/* 客户端
│   └── challenge-query-keys.ts
└── components/
    ├── ChallengeStartPage.tsx        # /games/$slug/start
    ├── ChallengePlayHost.tsx         # /games/$slug/attempts/$id/play
    ├── ChallengeResultPage.tsx       # .../result
    └── ChallengeExpiredPage.tsx      # .../expired
```

### 路由约定

| URL | 用途 |
|---|---|
| `/games/$gameSlug/start` | 选择难度+模式，调 `/start` 创建 attempt |
| `/games/$gameSlug/attempts/$attemptId/play?token=...` | 调 `/claim`，启动心跳和 broadcast，渲染游戏 |
| `/games/$gameSlug/attempts/$attemptId/result` | 显示 `/status` 拉取的成绩 |
| `/games/$gameSlug/attempts/$attemptId/expired?reason=...` | 显示终止原因 |

旧的 `/games/$slug/play` 路由（life-game / PCB / 绝对指令）暂时保留，渲染遗留组件；Change 7 会清理为统一 redirect。

### entryToken 持有规则

- **RANKED / DAILY**：仅在 React 内存（`useChallengeRuntimeStore.entryToken`）。刷新即丢失，路由守卫会重定向到 `/expired`。
- **PRACTICE**：可写 sessionStorage，刷新可恢复 claim（已在策略中允许 `allowResume=true`）。

## 8. 关键并发原则

1. CAS 条件更新（`updateMany WHERE status=expected`）是唯一 transitional 写法。
2. `statusVersion` 字段在每次合法迁移自增，外部 watchers 可用它做防抖。
3. 终态不可被普通接口改回 — 仅 admin（Change 6 仲裁流程）可设置 REVOKED / ADMIN_CORRECTED。
4. RANKED 双开攻击由 `uq_user_active_ranked_attempt` 兜底；接口直接返回现存 attemptId（视为幂等）。

## 9. Idempotency-Key（部分覆盖）

- `POST /start` 接受 `idempotencyKey` 字段，落到 `GameAttempt.idempotencyKey`，唯一约束 `(userId, idempotencyKey)`。同 key 重放返回原 attempt。
- 其他端点的全量幂等中间件（`IdempotencyRecord` 表）由 Change 6 完成。

## 10. 已实现 vs Change 6/7 待补

| 项 | Change 3 | Change 6 | Change 7 |
|---|:-:|:-:|:-:|
| `/start /claim /heartbeat /abandon /finish /status` | ✅ | — | — |
| CAS 条件更新 + 部分唯一索引 | ✅ | — | — |
| ChallengeAuditLog 写入 | ✅ | — | — |
| 4 个 GameRuntimeAdapter (start/finish) | ✅ | — | — |
| ChallengeReaperWorker（cron） | ✅ | 升级 BullMQ | — |
| ScoreRecord 写入 | ❌（Change 5） | — | — |
| Redis 锁包裹 finish | ❌ | ✅ | — |
| IdempotencyRecord 全量幂等 | ❌（仅 start） | ✅ | — |
| 心跳双写 PG + Redis ZSET | ❌（仅 PG） | ✅ | — |
| REVIEW_REQUIRED 自动路由 | ❌ | ✅ | — |
| 中间提交 endpoint `/submissions` | ❌ | — | ✅ |
| GameRuntimeAdapter.verifySubmission | stub | — | ✅ |
| 老 `/games/$slug/play` 重定向到 `/start` | partial | — | ✅ |

## 11. 演示路径

```
1. 登录 demo@example.com / Demo123456。
2. 浏览到 /games/sliding-puzzle/start。
3. 选 easy / RANKED → 点 “开始挑战”。
4. URL 跳到 /games/sliding-puzzle/attempts/<id>/play?token=...
5. 心跳每 5s POST 一次，phase=playing 推进 status 到 PLAYING。
6. 占位 “提交” 按钮提交 finalState（demo），跳到 /result 显示 COMPLETED。
7. 在另一个标签页打开同一 URL → 第一个标签页转到 /expired (reason=tab-conflict)。
```
