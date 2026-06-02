# SuperBrain 排行榜管道（Leaderboard Pipeline）

> **状态**：Change 5 `redesign-leaderboard-pipeline` 已完成。三表管道（ScoreRecord / LeaderboardBest / LeaderboardRankCache）+ 周期解析器 + 异步刷新 worker 全部就位；`/api/challenges/:id/finish` 在事务内写榜。
> **真理源**：`apps/api/src/leaderboards/`、`apps/api/src/challenges/challenges.service.ts:finish()`。

---

## 1. 三表管道

```
玩家 finish() 提交
   │
   ▼
[ ChallengesService.finish() — TXN ]
   │ 1) CAS PLAYING→SUBMITTING
   │ 2) adapter.finishAttempt() → AttemptValidationReport
   │ 3) CAS SUBMITTING→COMPLETED (设置 scoreValue / scoreEligibility)
   │ 4) ScoreRecordingService.recordScores(attempt, metrics, tx)
   ▼
ScoreRecord (写入侧, append-only)
   │
   ├── upsert per (leaderboardId, attemptId)
   │
   ▼
LeaderboardBest (读优化, BEST_PER_USER)
   │ 仅当新成绩在 board.rankDirection 上更优时更新
   │
   ▼
LeaderboardRankCache (展示缓存, top-N)
   ▲
   │ on-write hint (5s 防抖) + LeaderboardRefreshWorker (cron 60s)
```

### 关键约束

| 表 | 唯一键 | 说明 |
|---|---|---|
| `ScoreRecord` | `(leaderboardId, attemptId)` | 防止同 attempt 重复写榜 |
| `LeaderboardBest` | `(leaderboardId, periodId, userId)` | 一个用户/周期/榜单仅一条最佳 |
| `LeaderboardRankCache` | `(leaderboardId, periodId, rankPosition)` + `(leaderboardId, periodId, userId)` | 唯一名次 + 同用户单条 |

事务保证：scoreRecord/leaderboardBest 写入与 GameAttempt → COMPLETED 在同一 PG transaction，要么都成功要么都回滚。

## 2. 周期解析（PeriodResolverService）

| periodType | periodKey 形态（Asia/Shanghai） |
|---|---|
| `ALL_TIME` | `'all-time'` |
| `DAILY` | `'2026-06-01'`（按本地午夜切） |
| `WEEKLY` | `'2026-W23'`（ISO 周） |
| `MONTHLY` | `'2026-06'` |
| `SEASONAL` | `'2026-S2'`（季度 1-4） |
| `CUSTOM` | ISO 时间戳，匹配 admin 创建的窗口 |

每次 `recordScores` 调用 `getOrCreatePeriod()` 懒创建 `LeaderboardPeriod` 行（`@@unique([leaderboardId, periodKey])`）。

## 3. 评分指标与 tieBreakers

`LeaderboardDefinition` 字段：

```ts
{
  rankMetric: string,                      // e.g. 'durationMs', 'commandCount', 'scoreValue'
  rankDirection: 'ASC' | 'DESC',
  tieBreakers: [
    { metric: 'errorCount', direction: 'ASC' },
    { metric: 'completedAt', direction: 'ASC' },
  ],
  entryPolicy: 'BEST_PER_USER' | 'ALL_ATTEMPTS',
  displayLimit: 100,
  metadata: { displayColumns: [...] },
}
```

`ScoreRecordingService.computeRankInputs` 按 `rankMetric` 从 `attempt` + `metrics` 中提取：
- `durationMs` / `completedAt` / `scoreValue` → 直接读 attempt 字段。
- 其它 → 从 `metricsSummary` JSON 中读取。

## 4. 端点

### Player（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/leaderboards?gameId=&difficultyId=&mode=&periodType=` | 列出可见 board |
| `GET` | `/api/leaderboards/:slug?periodKey=&offset=&limit=` | top-N + currentUserRank |
| `GET` | `/api/leaderboards/:slug/periods?limit=30` | 历史周期列表 |

### `FinishChallengeResponse.leaderboards`

每次 finish 成功返回：
```json
{
  ...,
  "leaderboards": [
    { "leaderboardSlug": "sliding-puzzle-easy-fastest", "recorded": true, "currentRank": 1 }
  ]
}
```

`SPA ChallengeResultPage` 可据此即时显示玩家在哪些榜上的名次。

## 5. RankCacheService 与 worker

- `scheduleRefresh(boardId, periodId)` 5s 防抖 hint 队列。
- `LeaderboardRefreshWorker`（`@nestjs/schedule`，60s 一次）：
  1. 先 drain 所有 hint。
  2. 扫描 `LeaderboardBest.updatedAt > LeaderboardRankCache.generatedAt` 的过期 board，挨个 refresh。
- 读端点 `GET /api/leaderboards/:slug` 在 cache 为空时会 inline 跑一次 refresh 兜底。
- Change 6 会把 worker 切换到 BullMQ 独立进程，并包 Redis 锁。

## 6. 撤销流程（Admin）

> 完整 admin 端 score-record:revoke 端点暂未提供（Change 6 与仲裁工作流一起补 `POST /api/admin/score-records/:id/revoke`）。当前 manual 撤销请通过 SQL 同时：
> 1. 把目标 `ScoreRecord.status='REVOKED', revokedAt=now`。
> 2. 在 `LeaderboardBest` 中如果该 `scoreRecordId` 还是当前最佳，更新到次佳 ScoreRecord 或删除该 best 行。
> 3. 调 `RankCacheService.refreshCache(...)`。

## 7. 限制 / 待补

- `ALL_ATTEMPTS` 策略板的读取目前未走 `ScoreRecord` 直查，演示场景以 `BEST_PER_USER` 为主。
- 撤销 endpoint 与 admin SPA Manage UI（Change 6 一起）还未实现。
- `period.lockedAt` 字段未被任何代码使用；预留给 Change 6 周期锁定流程。
- `LeaderboardDefinition.metadata.cacheTtlSec` 暂未被读取（cache 永远以 `updatedAt > generatedAt` 判定过期）。
- 排行榜 admin CRUD UI 尚未上线，新增榜单需 `pnpm api -- prisma db seed` 或 SQL 补，再用现有 `/api/admin/games` 流程激活。

## 8. 与其他 Overview 的关系

- 写榜上下游 GameAttempt 状态机见 `Overview-Challenge-Runtime.md` §2。
- LeaderboardDefinition 字段与默认 seed 见 `Overview-Game-Catalog.md` §2.3 + `Overview-Database.md` §6 排行榜表。
- 并发硬化（Redis 锁、BullMQ、撤销端点）见 `Overview-Concurrency.md`（Change 6 完成时写）。
