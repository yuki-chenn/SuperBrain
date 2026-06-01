# rule: 定义 LeaderboardDefinition

排行榜是 `(game, mode, difficulty?, puzzle?)` 维度的成绩集合。每个游戏建议至少 1 个 RANKED ALL_TIME 榜。

## 字段

| 字段 | 例 | 说明 |
|---|---|---|
| `slug` | `sliding-puzzle-easy-fastest` | 全平台唯一；用于 `GET /api/leaderboards/:slug` |
| `name` | `数字华容道 3x3 最快通关榜` | 显示名 |
| `scope` | `GLOBAL / PUZZLE / FRIENDS / ...` | 通常 GLOBAL；PUZZLE 需要绑定 puzzleId |
| `periodType` | `ALL_TIME / DAILY / WEEKLY / MONTHLY / SEASONAL / CUSTOM` | 周期粒度 |
| `mode` | `RANKED` | 哪些 attempt mode 进榜；NULL = 所有 mode |
| `difficultyId` | string \| null | 仅锁定该难度；NULL = 任意难度 |
| `puzzleId` | string \| null | PUZZLE scope 时必填 |
| `rankMetric` | `durationMs / commandCount / scoreValue / ...` | 主排序指标，从 `attempt` 字段或 `metricsSummary` 取 |
| `rankDirection` | `ASC / DESC` | 排序方向（ASC：用时榜；DESC：分数榜） |
| `tieBreakers` | `[{metric, direction}]` | 同 rankValue 的破平顺序，最多 3 项 |
| `entryPolicy` | `BEST_PER_USER / ALL_ATTEMPTS` | 是否按用户取最佳 |
| `displayLimit` | 100 | RankCache 缓存的 top-N |
| `metadata.displayColumns` | `[{metric,label,format}]` | UI 显示列 |

## seed 模板

`apps/api/prisma/seed/leaderboards.ts`：

```ts
'<game>': [
  { slug: '<game>-<difficulty>-fastest',
    name: '...',
    difficultyKey: 'easy',
    rankMetric: 'durationMs',
    rankDirection: 'ASC',
    tieBreakers: [
      { metric: 'errorCount', direction: 'ASC' },
      { metric: 'completedAt', direction: 'ASC' },
    ],
    metadata: {
      displayColumns: [
        { metric: 'durationMs', label: '用时', format: 'duration' },
        { metric: 'errorCount', label: '错误次数' },
      ],
    },
  },
],
```

## rankMetric 取值

`ScoreRecordingService.computeRankInputs` 按以下顺序解析 `rankMetric`：
1. `'durationMs'` → `attempt.durationMs`
2. `'completedAt'` → `attempt.completedAt.getTime()`
3. `'scoreValue'` → `Number(attempt.scoreValue)`
4. 其它 key → `metrics[key]`（adapter `finishAttempt` 返回的 `metrics` 中）

`metrics` 必须是数字才能进入 rankValue/tieValue 字段。

## 自动写榜

`/api/challenges/:id/finish` 内事务：成功时调 `ScoreRecordingService.recordScores(attempt, metrics, tx)`，按 `gameId+mode+difficulty+puzzle` 匹配所有 ACTIVE 板，依次 INSERT ScoreRecord + upsert LeaderboardBest（BEST_PER_USER 时方向感知）+ schedule cache refresh。

## 周期解析

`PeriodResolverService.resolveKey(periodType, completedAt, timezone)` 默认 `Asia/Shanghai`：

| periodType | periodKey 例 |
|---|---|
| `ALL_TIME` | `'all-time'` |
| `DAILY` | `'2026-06-01'` |
| `WEEKLY` | `'2026-W23'` |
| `MONTHLY` | `'2026-06'` |
| `SEASONAL` | `'2026-S2'` |

## 端点速查

| 操作 | 方法 | 路径 |
|---|---|---|
| 玩家：列出可见板 | `GET` | `/api/leaderboards?gameId=&difficultyId=&mode=&periodType=` |
| 玩家：top-N + 自己排名 | `GET` | `/api/leaderboards/:slug?periodKey=&offset=&limit=` |
| 玩家：历史周期 | `GET` | `/api/leaderboards/:slug/periods?limit=30` |
| 管理员：撤销成绩 | `POST` | `/api/admin/score-records/:id/revoke` |
