# SuperBrain 数据库总览（重构后 v2）

> **状态**：Schema 重构已完成（OpenSpec change `redesign-database-schema-greenfield`），后端模块层和前端层的对接正在分阶段进行。本文件描述 **新** 的 40 模型数据库设计。  
> **真理源**：`apps/api/prisma/schema.prisma` 是字段级别的最终真理源；本文件提供概念性总览，便于新增游戏/模块时快速理解。  
> **相关文档**：`docs/8-superbrain-database-redesign.md`（原始重构设计文档）、`openspec/changes/redesign-database-schema-greenfield/design.md`（落地决策记录）。

---

## 1. 整体结构

数据库使用 PostgreSQL 16 + Prisma ORM，按 8 个数据域 + 1 个游戏字典域共 **40 个模型** 组织：

```
┌─ Identity & Access (6) ──────────────────────────────────────┐
│  User · AuthSession · Role · Permission · UserRole           │
│  · RolePermission                                            │
├─ Game Catalog & Policy (5) ──────────────────────────────────┤
│  Game · GameRuleSetVersion · GameDifficulty                  │
│  · GameContentPolicy · GameChallengePolicy                   │
├─ Puzzle System (6) ──────────────────────────────────────────┤
│  Puzzle · PuzzleVersion · PuzzleSchedule                     │
│  · PuzzleTag · PuzzleTagBinding · PuzzleAsset                │
├─ Challenge Runtime (8) ──────────────────────────────────────┤
│  GameAttempt · AttemptRuntimeSession                         │
│  · AttemptOperationLog · AttemptOperationBatch               │
│  · AttemptSnapshot · GameSubmission                          │
│  · AttemptValidationReport · ChallengeAuditLog               │
├─ Idempotency (1) ────────────────────────────────────────────┤
│  IdempotencyRecord                                           │
├─ Leaderboard & Score (5) ────────────────────────────────────┤
│  LeaderboardDefinition · LeaderboardPeriod                   │
│  · ScoreRecord · LeaderboardBest · LeaderboardRankCache      │
├─ Admin & Audit (2) ──────────────────────────────────────────┤
│  AdminAuditLog · AdminReviewTask                             │
├─ Data Lifecycle (4) ─────────────────────────────────────────┤
│  DataRetentionPolicy · DataArchiveBatch                      │
│  · DataArchiveObject · DataCleanupRun                        │
├─ Game-Specific Dictionary (3) ───────────────────────────────┤
│  CharacterRadical · CharacterRoot · CharacterCombination     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 枚举集合（27 个）

按数据域归类：

| 数据域 | 枚举 |
|---|---|
| Identity | `UserStatus`, `AuthSessionStatus` |
| Catalog | `GameStatus`, `ConfigStatus`, `ConfigValidationStatus`, `ContentMode`, `PuzzleSelectionStrategy` |
| Puzzle | `PuzzleStatus`, `PuzzleVersionStatus`, `ScheduleGranularity` |
| Runtime | `ChallengeMode`, `AttemptStatus`, `AttemptValidationStatus`, `ScoreEligibility`, `OperationLogMode`, `SnapshotType`, `SubmissionType`, `BatchStatus`, `IdempotencyStatus` |
| Leaderboard | `LeaderboardScope`, `LeaderboardPeriodType`, `RankDirection`, `EntryPolicy`, `ScoreRecordStatus` |
| Lifecycle | `RetentionAction`, `ArchiveFormat`, `CleanupRunStatus` |

### 关键枚举速查

**AttemptStatus**（13 值）：
```
CREATED → CLAIMED → PLAYING → SUBMITTING → COMPLETED
                      │            │
                      ↓            ↓
                    PAUSED        TIMEOUT
                      │
                      ↓
                  ABANDONED · INTERRUPTED · INVALIDATED
                  
后置终态（仅后台介入）：REVIEW_REQUIRED · REVOKED · ADMIN_CORRECTED
```

**ChallengeMode**（6 值）：`RANKED` · `DAILY` · `CASUAL` · `PRACTICE` · `ROOM` · `ADMIN_TEST`

**ContentMode**（4 值）：`GENERATED`（华容道）· `CURATED`（生命/造字/绝对指令）· `SCHEDULED`（周期题）· `MIXED`

**ConfigValidationStatus** vs **AttemptValidationStatus**：故意拆成两个枚举。前者用于配置审核（含 `WARNING`），后者用于挑战验证（含 `REVIEW_REQUIRED`）。详见 `design.md` D4。

---

## 3. 核心关系图

```
User ─┬─ AuthSession            (登录会话)
      ├─ UserRole ─ Role ─ RolePermission ─ Permission
      ├─ GameAttempt
      ├─ GameSubmission
      ├─ ScoreRecord
      ├─ LeaderboardBest
      ├─ AdminAuditLog (actor)
      └─ AdminReviewTask (requestedBy / reviewedBy)

Game ─┬─ GameRuleSetVersion       (规则引擎版本)
      ├─ GameDifficulty           (难度版本)
      ├─ GameContentPolicy        (题库选择策略)
      ├─ GameChallengePolicy      (运行时策略：心跳/日志/快照)
      ├─ Puzzle ─ PuzzleVersion ─ PuzzleTagBinding ─ PuzzleTag
      │         ├─ PuzzleAsset
      │         └─ PuzzleSchedule
      ├─ GameAttempt
      └─ LeaderboardDefinition

GameAttempt ─┬─ AttemptRuntimeSession   (运行时会话，entryToken/playSessionId)
             ├─ AttemptOperationLog ─ AttemptOperationBatch
             ├─ AttemptSnapshot
             ├─ GameSubmission
             ├─ AttemptValidationReport
             ├─ ChallengeAuditLog
             └─ ScoreRecord

LeaderboardDefinition ─┬─ LeaderboardPeriod
                       ├─ ScoreRecord       (写入侧，每挑战一条)
                       ├─ LeaderboardBest   (BEST_PER_USER 物化)
                       └─ LeaderboardRankCache (前 N 名展示缓存)

DataRetentionPolicy ── DataArchiveBatch ── DataArchiveObject
                                  ↘
                                    DataCleanupRun
```

---

## 4. 关键设计原则

### 4.1 版本化的游戏配置（D2 / D5）

后台编辑配置不会立即影响进行中的挑战。所有挑战开始时必须 **快照** 当前 active 版本 ID：
- `GameRuleSetVersion.id` → `GameAttempt.ruleSetVersionId`
- `GameDifficulty.id` + `.version` → `GameAttempt.difficultyId / difficultyVersion`
- `GameContentPolicy.id` → `GameAttempt.contentPolicyId`
- `GameChallengePolicy.id` → `GameAttempt.challengePolicyId`
- `PuzzleVersion.id` → `GameAttempt.puzzleVersionId`（仅 CURATED/SCHEDULED）

校验时只读取挑战绑定的版本，不读取当前 active。

### 4.2 GENERATED 模式的版本锁

华容道这类纯生成游戏 `puzzleId = NULL`、`puzzleVersionId = NULL`，靠 `seed + generatedContentHash + ruleSetVersionId` 三联保证可重放校验。

### 4.3 三表排行榜管道

```
GameAttempt.complete()  ── txn ──→  ScoreRecord (写入)
                                       ↓
                                LeaderboardBest (upsert，BEST_PER_USER 物化)
                                       ↓
                                LeaderboardRankCache (异步刷新，前 N 名)
```

`ScoreRecord` 永远保留所有提交；`LeaderboardBest` 每 `(leaderboard, period, user)` 仅一条；`LeaderboardRankCache` 只存展示用的 top-N。

### 4.4 RBAC（D9）

User 表 **不再有 role 字段**。授权通过 `UserRole → Role → RolePermission → Permission` 联表派生。8 个内置角色 + 39 个权限点 seed 已就绪，应用层用 `@RequirePermission('puzzle:publish')` 之类装饰器检查。

### 4.5 一切都可幂等重试

- 所有写接口需要带 `idempotencyKey`，落到 `IdempotencyRecord` 表。
- `GameAttempt.idempotencyKey` 对 `userId` 唯一，可重放 start 请求。
- `GameSubmission.idempotencyKey` 对 `attemptId` 唯一，可重放中间提交。

### 4.6 CAS 状态机 + 部分唯一索引

后端推进 attempt 状态必须用条件更新：
```sql
UPDATE "GameAttempt" SET status='SUBMITTING', "statusVersion"="statusVersion"+1
WHERE id=$1 AND status='PLAYING' AND "playSessionId"=$2;
```
数据库层 7 个部分唯一索引兜底（详见 `design.md` D13 / `schema.prisma` 末尾的 raw SQL）：
- `uq_active_game_ruleset_version` / `uq_active_game_difficulty`
- `uq_active_game_content_policy` / `uq_active_game_challenge_policy`
- `uq_published_puzzle_version`
- `uq_user_active_ranked_attempt`
- `uq_attempt_active_runtime_session`

---

## 5. 各表用途速查

### Identity & Access

| 模型 | 用途 |
|---|---|
| `User` | 用户身份。无 role 字段。`status: UserStatus`（ACTIVE/BANNED/DELETED）。 |
| `AuthSession` | Refresh Token 哈希存储、家族 ID 轮换、`status: AuthSessionStatus` 显式表达生命周期。 |
| `Role` / `Permission` | RBAC 维表。`Role.isSystem=true` 表示内置不可删。 |
| `UserRole` / `RolePermission` | 多对多关联，复合主键。 |

### Game Catalog & Policy

| 模型 | 用途 |
|---|---|
| `Game` | 游戏目录。`slug` 唯一。`status: GameStatus`。 |
| `GameRuleSetVersion` | 引擎规则版本。`(gameId, version)` 唯一；`status='ACTIVE'` 时同游戏仅一条。 |
| `GameDifficulty` | 难度版本。`(gameId, key, version)` 唯一；ACTIVE 同 `(gameId, key)` 仅一条。 |
| `GameContentPolicy` | 题库来源策略：`contentMode`（GENERATED/CURATED/SCHEDULED/MIXED）+ `selectionStrategy` + `generatorKey`。 |
| `GameChallengePolicy` | 运行时策略：心跳间隔、操作日志模式、快照频率、排行榜资格、最大重试次数等。按 `(gameId, mode, difficultyId)` 区分。 |

### Puzzle System

| 模型 | 用途 |
|---|---|
| `Puzzle` | 通用题目元信息。`(gameId, slug)` 唯一。`currentVersionId` 指向当前发布版本。 |
| `PuzzleVersion` | 题目内容版本。`content: Json`（不透明，shape 由 engine 定义）。`(puzzleId, contentHash)` 唯一；PUBLISHED 同 puzzleId 仅一条。 |
| `PuzzleSchedule` | 周期题排期（日/周/月/赛季）。 |
| `PuzzleTag` / `PuzzleTagBinding` | 题目标签系统。 |
| `PuzzleAsset` | 题目外部资源（图片、音频）。`sha256` 唯一。 |

### Challenge Runtime

| 模型 | 用途 |
|---|---|
| `GameAttempt` | 挑战主记录。30+ 字段：版本快照 ID、运行时字段（idempotencyKey/statusVersion/expiresAt/lastHeartbeatAt）、生命周期时间戳（每个状态一个时间字段）、验证字段、 reasons。 |
| `AttemptRuntimeSession` | 短暂的运行时会话。`entryTokenHash` 与 `playSessionId` 各自唯一。一个 attempt 同时只能有一个 active session。 |
| `AttemptOperationLog` | 玩家操作流水。`(attemptId, seqStart, seqEnd)` 唯一。`userId/gameId` 反规范化便于分区。 |
| `AttemptOperationBatch` | 批量提交摘要（payloadHash + 范围）。 |
| `AttemptSnapshot` | 状态快照（INITIAL/CHECKPOINT/FINAL/ERROR/VALIDATION/ADMIN_REVIEW）。 |
| `GameSubmission` | 玩家中间或最终提交（REGION/ROUND/STEP/COMMAND/CHECKPOINT/FINAL）。`(attemptId, idempotencyKey)` 唯一。 |
| `AttemptValidationReport` | 服务端权威验证结果，含 anti-cheat flags。 |
| `ChallengeAuditLog` | 状态迁移审计（每次 fromStatus→toStatus）。 |

### Idempotency

| 模型 | 用途 |
|---|---|
| `IdempotencyRecord` | 横切幂等表。`(userId, key)` 唯一。`responseBody` 保存首次成功的响应以便重放。 |

### Leaderboard & Score

| 模型 | 用途 |
|---|---|
| `LeaderboardDefinition` | 排行榜定义。`(gameId, slug)` 唯一。`tieBreakers: Json` 描述次序规则。`displayLimit`/`adminQueryLimit` 控制读取上限。 |
| `LeaderboardPeriod` | 排行榜周期切片（日榜/周榜/赛季榜的具体周期）。 |
| `ScoreRecord` | 成绩写入侧。每挑战每榜一条。`rankValue/tieValue1-3` 用 `Decimal(18,6)`。 |
| `LeaderboardBest` | BEST_PER_USER 物化表。`(leaderboardId, periodId, userId)` 唯一。 |
| `LeaderboardRankCache` | 前 N 名缓存。`(leaderboardId, periodId, rankPosition)` + `(leaderboardId, periodId, userId)` 双唯一。 |

### Admin & Audit

| 模型 | 用途 |
|---|---|
| `AdminAuditLog` | 管理员操作审计。`before/after: Json?`。应用层负责剥除敏感字段。 |
| `AdminReviewTask` | 仲裁任务（题目发布审核 / REVIEW_REQUIRED attempt 复核）。 |

### Data Lifecycle

| 模型 | 用途 |
|---|---|
| `DataRetentionPolicy` | 各表的保留策略：`onlineRetentionDays` / `archiveAfterDays` / `deleteAfterDays` / `action`（KEEP/COMPACT/ARCHIVE/DELETE/ANONYMIZE）。 |
| `DataArchiveBatch` | 一次归档任务（时间窗）。 |
| `DataArchiveObject` | 归档生成的对象（JSONL_GZIP / PARQUET / CSV_GZIP），`storageKey` 唯一。 |
| `DataCleanupRun` | 清理任务执行记录。 |

### Game-Specific Dictionary

| 模型 | 用途 |
|---|---|
| `CharacterRadical` | 精准造字部首字典。`key` 唯一。 |
| `CharacterRoot` | 精准造字字根字典。`key` 唯一。 |
| `CharacterCombination` | 部首 × 字根 → 汉字。`(radicalId, rootId, resultChar)` 唯一。 |

---

## 6. Seed 基线

执行 `pnpm api -- prisma db seed` 会按以下顺序填充：

| Seed 模块 | 写入内容 | 数量 |
|---|---|---:|
| `permissions.ts` | Permission keys | 39 |
| `roles.ts` | 内置 Role + RolePermission | 8 / 123 |
| `dictionary.ts` | Radical / Root / Combination | 20 / 40 / 125 |
| `games.ts` | Game + RuleSetVersion + Difficulty + ContentPolicy + ChallengePolicy | 4 / 4 / 10 / 4 / 8 |
| `puzzles-curated.ts` | Puzzle + PuzzleVersion（生命/造字/绝对指令） | 21 / 21 |
| `leaderboards.ts` | LeaderboardDefinition | 13 |
| `retention.ts` | DataRetentionPolicy | 6 |

所有 seed 模块 **幂等**：使用业务 key 作为 upsert 条件，重复执行不会插入重复行。

---

## 7. 本地重置流程

```bash
# 完整重置（先警告）
RESET_DB=1 ./start.sh

# 或者手动两步
pnpm --filter api exec prisma migrate reset --force --skip-seed
pnpm --filter api exec prisma db seed
```

`start.sh` 内置警告横幅：
- `RESET_DB=1` 触发重置流程
- 默认要求输入 `RESET` 确认
- CI 设置 `OPSX_DB_RESET_CONFIRM=1` 跳过交互

---

## 8. 后续阶段

本数据库重构已落地，但 NestJS 模块层尚未对接新 Schema。`AppModule` 当前只引入 `PrismaModule + RedisModule`，旧业务模块（auth/users/games/attempts/leaderboards/admin）通过 `apps/api/tsconfig.json` 临时排除编译。

后续 OpenSpec changes：

| Change | 目标 |
|---|---|
| `introduce-rbac-and-auth-session` | 重建 AuthModule（AuthSession + RBAC guards） |
| `introduce-challenge-runtime-gateway` | 重建 Challenges/Attempts/GameAdapter Registry，前端 Challenge Runtime 层 |
| `unify-puzzle-and-game-config` | 重建 admin 题目编辑器，对齐 PuzzleVersion.content |
| `redesign-leaderboard-pipeline` | ScoreRecord/LeaderboardBest/RankCache 三层写入 |
| `harden-concurrency-stack` | BullMQ + 5 workers + Redis 锁 + IdempotencyRecord + PgBouncer |
| `retire-game-specific-endpoints` | 删除遗留 /api/life-game、/api/precise-character 等专用端点 |

每个 change 完成后会更新对应的 `Overview-*.md` 文档（待生成）。
