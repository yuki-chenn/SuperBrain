# rule: 定义 GameContentPolicy 与 GameChallengePolicy

游戏的两套策略：**ContentPolicy** 决定题库来源，**ChallengePolicy** 决定挑战运行时行为。两者均按 `(gameId, mode, difficultyId)` 范围设置；NULL 表示通配。

## GameContentPolicy 字段

| 字段 | 说明 |
|---|---|
| `contentMode` | `GENERATED` / `CURATED` / `SCHEDULED` / `MIXED` |
| `selectionStrategy` | CURATED 时：`RANDOM / ROUND_ROBIN / MANUAL / DAILY / WEEKLY / WEIGHTED_RANDOM` |
| `generatorKey` | GENERATED 时必填，引擎对应的 generator 名 |
| `generatorConfig` | 传给 generator 的 JSON 参数 |
| `puzzlePoolFilter` | CURATED 时筛选 PuzzleVersion 的过滤器 |
| `scheduleGranularity` | SCHEDULED 时使用 |
| `allowRepeatedPuzzle` / `repeatCooldownHours` | 防同题重复 |
| `weightConfig` | WEIGHTED_RANDOM 时使用 |

## GameChallengePolicy 字段

| 字段 | 默认（RANKED） | 默认（PRACTICE） | 说明 |
|---|:-:|:-:|---|
| `allowResume` | false | true | 刷新可恢复 |
| `allowMultipleActive` | false | true | 多活跃 attempt |
| `requiresHeartbeat` | true | false | 是否要心跳 |
| `heartbeatIntervalSec` | 5 | 30 | 客户端心跳间隔 |
| `heartbeatTimeoutSec` | 15 | 90 | reaper 触发阈值 |
| `operationLogMode` | BATCHED | NONE | 操作日志策略 |
| `operationBatchSize` | 20 | 20 | 批量大小 |
| `snapshotEveryNEvents` | null | null | N 次操作生成一次 checkpoint |
| `saveInitialSnapshot` | true | true | 起始快照 |
| `saveFinalSnapshot` | true | false | 终点快照 |
| `eligibleForLeaderboard` | true | false | 是否计排行 |
| `maxSubmitRetry` | 1 | 5 | 最终提交允许重试次数 |

## 不变量

- `uq_active_game_content_policy` (NULLS NOT DISTINCT)：`(gameId, difficultyId, mode)` 仅一条 ACTIVE。
- `uq_active_game_challenge_policy` (NULLS NOT DISTINCT)：同上。

## 决策流（`/start` 内）

```
mode = body.mode
difficulty = active(gameId, mode? difficulty by key)
contentPolicy = first ACTIVE matching (gameId, mode, difficultyId)，越具体越优先
challengePolicy = first ACTIVE matching (gameId, mode, difficultyId)，越具体越优先
```

## Seed 模板

参见 `apps/api/prisma/seed/games.ts` 中 `seedGames(prisma)` 的 `defaultChallengePolicy(mode)`。

## 端点

| 操作 | 方法 | 路径 |
|---|---|---|
| 创建 ContentPolicy DRAFT | `POST` | `/api/admin/games/:gameId/content-policies` |
| 激活 ContentPolicy | `POST` | `/api/admin/games/content-policies/:id/activate` |
| 创建 ChallengePolicy DRAFT | `POST` | `/api/admin/games/:gameId/challenge-policies` |
| 激活 ChallengePolicy | `POST` | `/api/admin/games/challenge-policies/:id/activate` |
