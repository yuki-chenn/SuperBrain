# SuperBrain 高并发设计架构文档

## 1. 设计目标

SuperBrain 高并发设计采用以下目标：

```txt
1. 所有挑战状态以 PostgreSQL 中的 GameAttempt 为最终事实源。
2. 所有正式挑战的并发竞争必须通过数据库约束、事务、条件更新拦截。
3. Redis 只承担短期锁、限流、心跳、缓存、队列削峰，不承担最终状态事实源。
4. 前端 Runtime Gateway 只负责用户体验层拦截，不承担安全和一致性职责。
5. 所有游戏通过统一挑战状态机接入，不允许游戏组件自行处理并发规则。
6. 排行榜写入必须和挑战完成保持事务一致，展示榜单允许异步缓存。
7. 操作日志允许异步批量落库，但影响反作弊校验的数据必须可追溯、可补偿。
8. 后台配置发布必须版本化，玩家开始挑战后只绑定固定版本，不读取当前最新版本。
9. 高并发下系统必须支持水平扩展 API 实例和 Worker 实例。
10. 所有异常状态必须能通过后台任务修复或进入人工审核状态。
```

---

## 2. 总体并发架构

### 2.1 架构分层

```txt
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│                                                              │
│  React SPA                                                    │
│  TanStack Router                                               │
│  Challenge Runtime Gateway                                     │
│  ChallengeRouteGuard                                           │
│  ChallengeHeartbeat                                            │
│  ChallengeBroadcast                                            │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      Gateway / Edge Layer                     │
│                                                              │
│  Nginx / API Gateway                                          │
│  IP 限流                                                       │
│  请求体大小限制                                                │
│  静态资源缓存                                                  │
│  gzip / brotli                                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                       API Layer                               │
│                                                              │
│  NestJS 多实例                                                 │
│  AuthModule                                                    │
│  ChallengesModule                                              │
│  AttemptsModule                                                │
│  GameAdapter Registry                                          │
│  LeaderboardsModule                                            │
│  AdminModule                                                   │
│  ZodPipe                                                       │
│  ThrottlerGuard                                                │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
┌──────────────────────────────┐   ┌───────────────────────────┐
│          Redis Layer          │   │      PostgreSQL Layer      │
│                              │   │                           │
│  distributed lock             │   │  transaction               │
│  rate limit                   │   │  unique constraint         │
│  heartbeat                    │   │  partial index             │
│  leaderboard cache            │   │  row lock                  │
│  idempotency short cache      │   │  CAS update                │
│  BullMQ queue                 │   │  partitioned log tables    │
└───────────────┬──────────────┘   └─────────────┬─────────────┘
                │                                │
                ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│                         Worker Layer                          │
│                                                              │
│  ChallengeReaperWorker                                        │
│  LeaderboardRefreshWorker                                     │
│  OperationLogFlushWorker                                      │
│  RetentionArchiveWorker                                       │
│  AuditLogWorker                                               │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术方案 | 用法 |
|---|---|---|
| API 服务 | NestJS 多实例 | 所有实例无本地状态，可水平扩容 |
| ORM | Prisma | 常规 CRUD、事务、查询封装 |
| 高级 SQL | Prisma `$executeRaw` / `$queryRaw` | partial index、`FOR UPDATE SKIP LOCKED`、复杂 upsert |
| 主数据库 | PostgreSQL 16 | 最终一致性、事务、约束、排行榜事实源 |
| 缓存/锁/队列 | Redis 7 + ioredis | 锁、限流、心跳、榜单缓存、队列 |
| 队列 | BullMQ | 异步任务、延迟任务、失败重试 |
| 连接池 | PgBouncer | 生产环境 API 多实例连接复用 |
| 限流 | NestJS Throttler + Redis storage | 多实例共享计数 |
| 压测 | k6 / Artillery | API 并发压测 |
| 监控 | Prometheus + Grafana | QPS、延迟、锁冲突、队列堆积 |

---

## 3. 核心并发原则

### 3.1 最终事实源原则

```txt
PostgreSQL 是以下数据的唯一最终事实源：

1. 用户身份与会话状态
2. GameAttempt 状态
3. PuzzleVersion / RuleSetVersion / DifficultyVersion
4. ScoreRecord
5. LeaderboardBest
6. AdminAuditLog
7. ChallengeAuditLog
8. OperationLog 落库数据
```

```txt
Redis 不允许作为以下数据的唯一来源：

1. attempt 最终状态
2. 成绩最终结果
3. 题目版本
4. 后台配置当前版本
5. 用户永久权限
6. 审计日志最终记录
```

### 3.2 状态机优先原则

所有挑战相关写接口都必须先校验并推进服务端状态机。

```txt
允许：
  先进行 GameAttempt 条件更新
  再执行游戏验证、日志写入、排行榜写入

禁止：
  先执行游戏验证
  再尝试更新 GameAttempt 状态
```

### 3.3 条件更新原则

所有高并发状态迁移必须使用 CAS 条件更新。

```txt
CAS = Compare-And-Set

UPDATE ...
WHERE id = ?
  AND status = expectedStatus
  AND playSessionId = ?
```

禁止使用以下模式：

```txt
1. SELECT attempt
2. if attempt.status === PLAYING
3. UPDATE attempt.status = SUBMITTING
```

必须使用以下模式：

```txt
1. UPDATE attempt
   SET status = SUBMITTING
   WHERE id = ? AND status = PLAYING
2. 判断 affected rows
3. affected rows = 1 才继续业务
4. affected rows = 0 则读取当前状态并返回幂等结果
```

### 3.4 Redis 只做短期保护

```txt
Redis lock 用于降低重复请求打到数据库的概率。
数据库条件更新用于保证最终正确性。
```

所有使用 Redis 锁的接口仍然必须有数据库条件更新兜底。

### 3.5 终态不可覆盖原则

以下状态是终态：

```txt
COMPLETED
ABANDONED
TIMEOUT
INTERRUPTED
INVALIDATED
REVIEW_REQUIRED
```

终态只能被后台管理员通过受控操作改为：

```txt
REVOKED
ADMIN_CORRECTED
```

普通接口不得把终态重新改回：

```txt
PLAYING
SUBMITTING
COMPLETED
```

### 3.6 版本锁定原则

开始挑战时必须写入以下版本 ID：

```txt
gameId
difficultyId
difficultyVersion
ruleSetVersionId
challengePolicyId
operationLogPolicyId
puzzleId
puzzleVersionId
leaderboardDefinitionIds
```

完成挑战时只读取 attempt 绑定的版本，不读取后台当前 active 版本。

---

## 4. 核心数据模型补充

### 4.1 GameAttempt 并发字段

```prisma
model GameAttempt {
  id                    String              @id @default(cuid())
  userId                String
  gameId                String
  mode                  ChallengeMode
  status                AttemptStatus       @default(CREATED)

  difficultyId          String?
  difficultyVersion     Int?
  ruleSetVersionId      String?
  puzzleId              String?
  puzzleVersionId       String?
  challengePolicyId     String?
  operationLogPolicyId  String?

  entryTokenHash        String?
  playSessionId         String?
  idempotencyKey        String?

  seed                  String?
  startedAt             DateTime?
  claimedAt             DateTime?
  playingAt             DateTime?
  submittedAt           DateTime?
  completedAt           DateTime?
  abandonedAt           DateTime?
  interruptedAt         DateTime?
  timeoutAt             DateTime?
  invalidatedAt         DateTime?
  expiresAt             DateTime?
  lastHeartbeatAt       DateTime?

  durationMs            Int?
  rankEligible          Boolean             @default(false)
  validationStatus      ValidationStatus    @default(PENDING)
  invalidReason         String?
  abandonReason         String?
  interruptReason       String?
  statusVersion         Int                 @default(0)

  finalState            Json?
  metrics               Json                @default("{}")

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([userId, idempotencyKey])
  @@index([userId, mode, status])
  @@index([gameId, mode, status])
  @@index([status, expiresAt])
  @@index([status, lastHeartbeatAt])
  @@index([puzzleVersionId])
  @@index([playSessionId])
  @@index([createdAt])
}
```

### 4.2 AttemptStatus

```prisma
enum AttemptStatus {
  CREATED
  CLAIMED
  PLAYING
  PAUSED
  SUBMITTING
  COMPLETED
  ABANDONED
  TIMEOUT
  INTERRUPTED
  INVALIDATED
  REVIEW_REQUIRED
  REVOKED
  ADMIN_CORRECTED
}
```

### 4.3 ValidationStatus

```prisma
enum ValidationStatus {
  PENDING
  VALIDATING
  VALID
  INVALID
  ERROR
  REVIEW_REQUIRED
}
```

### 4.4 ChallengeMode

```prisma
enum ChallengeMode {
  RANKED
  DAILY
  CASUAL
  PRACTICE
  ROOM
  ADMIN_TEST
}
```

### 4.5 IdempotencyRecord

```prisma
model IdempotencyRecord {
  id              String              @id @default(cuid())
  userId          String
  key             String
  route           String
  requestHash     String
  status          IdempotencyStatus   @default(PROCESSING)
  responseBody    Json?
  resourceType    String?
  resourceId      String?
  lockedUntil     DateTime?
  expiresAt       DateTime
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@unique([userId, key])
  @@index([expiresAt])
  @@index([status, lockedUntil])
}

enum IdempotencyStatus {
  PROCESSING
  SUCCEEDED
  FAILED
  EXPIRED
}
```

### 4.6 ChallengeAuditLog

```prisma
model ChallengeAuditLog {
  id              String     @id @default(cuid())
  attemptId       String
  userId          String?
  action          String
  fromStatus      String?
  toStatus        String?
  reason          String?
  requestId       String?
  playSessionId   String?
  metadata        Json       @default("{}")
  createdAt       DateTime   @default(now())

  @@index([attemptId, createdAt])
  @@index([userId, createdAt])
  @@index([action, createdAt])
}
```

### 4.7 AttemptOperationLog

```prisma
model AttemptOperationLog {
  id              String    @id @default(cuid())
  attemptId       String
  userId          String?
  playSessionId   String?
  batchId         String?
  seq             Int
  type            String
  payload         Json
  result          Json?
  clientTs        DateTime?
  serverTs        DateTime  @default(now())
  accepted        Boolean   @default(true)
  rejectReason    String?

  @@unique([attemptId, seq])
  @@index([attemptId, serverTs])
  @@index([userId, serverTs])
  @@index([batchId])
}
```

### 4.8 AttemptOperationBatch

```prisma
model AttemptOperationBatch {
  id              String     @id @default(cuid())
  attemptId       String
  userId          String?
  playSessionId   String?
  startSeq        Int
  endSeq          Int
  operationCount  Int
  payloadHash     String
  status          BatchStatus @default(ACCEPTED)
  rejectReason    String?
  createdAt       DateTime   @default(now())

  @@unique([attemptId, startSeq, endSeq])
  @@index([attemptId, createdAt])
}

enum BatchStatus {
  ACCEPTED
  DUPLICATE
  REJECTED
  FLUSHED
}
```

### 4.9 ScoreRecord

```prisma
model ScoreRecord {
  id              String      @id @default(cuid())
  leaderboardId   String
  periodId        String?
  userId          String
  attemptId       String

  rankValue       Decimal
  tieValue1       Decimal?
  tieValue2       Decimal?
  tieValue3       Decimal?
  metrics         Json        @default("{}")

  status          ScoreStatus @default(VALID)
  submittedAt     DateTime    @default(now())
  revokedAt       DateTime?
  revokeReason    String?

  @@unique([leaderboardId, attemptId])
  @@index([leaderboardId, periodId, rankValue, tieValue1, tieValue2, tieValue3])
  @@index([userId, leaderboardId, submittedAt])
  @@index([status, submittedAt])
}

enum ScoreStatus {
  VALID
  REVOKED
  HIDDEN
  REVIEW_REQUIRED
}
```

### 4.10 LeaderboardBest

```prisma
model LeaderboardBest {
  id              String    @id @default(cuid())
  leaderboardId   String
  periodId        String?
  userId          String
  scoreRecordId   String
  attemptId       String

  rankValue       Decimal
  tieValue1       Decimal?
  tieValue2       Decimal?
  tieValue3       Decimal?
  updatedAt       DateTime  @updatedAt

  @@unique([leaderboardId, periodId, userId])
  @@index([leaderboardId, periodId, rankValue, tieValue1, tieValue2, tieValue3])
}
```

### 4.11 LeaderboardRankCache

```prisma
model LeaderboardRankCache {
  id              String    @id @default(cuid())
  leaderboardId   String
  periodId        String?
  rank            Int
  userId          String
  scoreRecordId   String
  attemptId       String
  rankValue       Decimal
  tieValue1       Decimal?
  tieValue2       Decimal?
  tieValue3       Decimal?
  metrics         Json      @default("{}")
  generatedAt     DateTime  @default(now())

  @@unique([leaderboardId, periodId, rank])
  @@index([leaderboardId, periodId, generatedAt])
}
```

---

## 5. 数据库约束与索引

### 5.1 正式挑战 Active 唯一约束

RANKED / DAILY 模式下，同一用户同一时间只能存在一个 active attempt。

```sql
CREATE UNIQUE INDEX uq_user_active_ranked_attempt
ON "GameAttempt" ("userId")
WHERE "mode" IN ('RANKED', 'DAILY')
  AND "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING');
```

### 5.2 同游戏正式挑战 Active 唯一约束

如果需要允许用户同时玩不同游戏，则使用以下约束替代 5.1。

```sql
CREATE UNIQUE INDEX uq_user_game_active_ranked_attempt
ON "GameAttempt" ("userId", "gameId")
WHERE "mode" IN ('RANKED', 'DAILY')
  AND "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING');
```

项目默认使用 5.1。

### 5.3 幂等键唯一约束

```sql
CREATE UNIQUE INDEX uq_attempt_idempotency
ON "GameAttempt" ("userId", "idempotencyKey")
WHERE "idempotencyKey" IS NOT NULL;
```

### 5.4 操作日志序号唯一约束

```sql
CREATE UNIQUE INDEX uq_attempt_operation_seq
ON "AttemptOperationLog" ("attemptId", "seq");
```

### 5.5 操作批次唯一约束

```sql
CREATE UNIQUE INDEX uq_attempt_operation_batch_range
ON "AttemptOperationBatch" ("attemptId", "startSeq", "endSeq");
```

### 5.6 成绩写入唯一约束

```sql
CREATE UNIQUE INDEX uq_score_record_leaderboard_attempt
ON "ScoreRecord" ("leaderboardId", "attemptId");
```

### 5.7 排行榜最佳成绩唯一约束

```sql
CREATE UNIQUE INDEX uq_leaderboard_best_user
ON "LeaderboardBest" ("leaderboardId", "periodId", "userId");
```

### 5.8 当前配置唯一约束

每个游戏每个难度 key 只允许一个 ACTIVE 版本。

```sql
CREATE UNIQUE INDEX uq_active_game_difficulty
ON "GameDifficulty" ("gameId", "key")
WHERE "status" = 'ACTIVE';
```

每个题目只允许一个当前发布版本。

```sql
CREATE UNIQUE INDEX uq_active_puzzle_version
ON "PuzzleVersion" ("puzzleId")
WHERE "status" = 'ACTIVE';
```

### 5.9 定时扫描索引

```sql
CREATE INDEX idx_attempt_reaper_expires
ON "GameAttempt" ("status", "expiresAt")
WHERE "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING');

CREATE INDEX idx_attempt_reaper_heartbeat
ON "GameAttempt" ("status", "lastHeartbeatAt")
WHERE "status" IN ('PLAYING', 'SUBMITTING');
```

---

## 6. 事务隔离级别

### 6.1 默认隔离级别

业务事务默认使用 PostgreSQL `READ COMMITTED`。

```txt
适用场景：
1. startChallenge
2. claimAttempt
3. heartbeat
4. abandonAttempt
5. finishAttempt
6. operation batch submit
7. leaderboard best upsert
```

### 6.2 SERIALIZABLE 使用范围

以下低频强一致场景使用 `SERIALIZABLE` 或显式行锁：

```txt
1. 管理后台发布游戏配置
2. 发布 PuzzleVersion
3. 切换 GameDifficulty ACTIVE 版本
4. 锁定 LeaderboardPeriod
5. 批量撤销作弊成绩
```

### 6.3 行锁使用范围

允许使用 `SELECT ... FOR UPDATE`：

```txt
1. 发布配置时锁 Game 行
2. 发布题目版本时锁 Puzzle 行
3. finishAttempt 时锁当前 GameAttempt 行
4. 周期榜结算时锁 LeaderboardPeriod 行
5. 批量撤销成绩时锁 ScoreRecord 行
```

禁止对以下高频路径使用长事务行锁：

```txt
1. heartbeat
2. operation log 单条写入
3. 排行榜读取
4. 游戏列表读取
5. 题库列表读取
```

---

## 7. Redis 使用规范

### 7.1 Redis Key 规范

```txt
lock:challenge:start:{userId}
lock:challenge:claim:{attemptId}
lock:challenge:finish:{attemptId}
lock:challenge:abandon:{attemptId}

rate:user:{userId}:challenge:start
rate:user:{userId}:challenge:finish
rate:ip:{ip}:auth:login
rate:ip:{ip}:leaderboard:read

heartbeat:attempt:{attemptId}
heartbeat:user:{userId}:activeAttempt

idemp:{userId}:{idempotencyKey}

leaderboard:rank:{leaderboardId}:{periodId}
leaderboard:user-rank:{leaderboardId}:{periodId}:{userId}
leaderboard:refresh-dedup:{leaderboardId}:{periodId}

queue:leaderboard-refresh
queue:operation-log-flush
queue:data-retention
queue:challenge-reaper
```

### 7.2 分布式锁实现

加锁：

```txt
SET lock:challenge:finish:{attemptId} {lockToken} NX PX 10000
```

释放锁必须使用 Lua 比较 token：

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

### 7.3 Redis 锁 TTL

| 锁 | TTL | 用途 |
|---|---:|---|
| `lock:challenge:start:{userId}` | 3 秒 | 防止开始按钮重复点击 |
| `lock:challenge:claim:{attemptId}` | 5 秒 | 防止多 tab 同时 claim |
| `lock:challenge:finish:{attemptId}` | 10 秒 | 防止重复提交 |
| `lock:challenge:abandon:{attemptId}` | 5 秒 | 防止重复放弃 |
| `lock:leaderboard:refresh:{leaderboardId}:{periodId}` | 30 秒 | 防止重复刷新榜单缓存 |
| `lock:config:publish:{gameId}` | 30 秒 | 防止后台并发发布 |

### 7.4 Redis 锁降级策略

```txt
1. Redis 不可用时，start / claim / finish 不直接失败。
2. 系统退化为 PostgreSQL 条件更新和唯一约束兜底。
3. 限流能力退化时记录告警。
4. 排行榜缓存不可用时读取 PostgreSQL LeaderboardBest。
5. heartbeat Redis 不可用时临时写 PostgreSQL lastHeartbeatAt。
```

---

## 8. API 幂等设计

### 8.1 请求头

所有写接口支持：

```http
X-Request-Id: uuid
Idempotency-Key: uuid
```

### 8.2 幂等适用接口

| 接口 | 是否必须幂等 | 幂等维度 |
|---|---:|---|
| `POST /api/challenges/start` | 是 | `userId + Idempotency-Key` |
| `POST /api/challenges/:id/claim` | 是 | `attemptId + playSessionId` |
| `POST /api/challenges/:id/heartbeat` | 是 | `attemptId + playSessionId` |
| `POST /api/challenges/:id/abandon` | 是 | `attemptId + playSessionId` |
| `POST /api/challenges/:id/finish` | 是 | `attemptId + playSessionId` |
| `POST /api/challenges/:id/operations/batch` | 是 | `attemptId + startSeq + endSeq` |
| `POST /api/admin/config/publish` | 是 | `adminUserId + Idempotency-Key` |

### 8.3 幂等记录流程

```txt
1. 读取 Idempotency-Key。
2. 计算 requestHash。
3. INSERT IdempotencyRecord(status = PROCESSING)。
4. 如果唯一约束冲突：
   4.1 requestHash 相同且 SUCCEEDED → 返回历史 responseBody。
   4.2 requestHash 相同且 PROCESSING → 返回 409 / PROCESSING。
   4.3 requestHash 不同 → 返回 422 IDEMPOTENCY_KEY_REUSED。
5. 执行业务事务。
6. 写入 responseBody，状态改为 SUCCEEDED。
7. 失败时状态改为 FAILED，按接口策略决定是否允许重试。
```

### 8.4 幂等记录保留时间

```txt
start / finish：保留 24 小时
operation batch：保留 24 小时
admin publish：保留 7 天
heartbeat：不落 IdempotencyRecord
abandon：不落 IdempotencyRecord，只依赖状态机幂等
```

---

## 9. startChallenge 并发设计

### 9.1 目标

```txt
1. 防止同一用户重复创建正式挑战。
2. 防止网络重试创建多个 attempt。
3. 防止多标签页同时开始多个 RANKED / DAILY attempt。
4. CASCADE 到排行榜资格时只能有一个有效 active attempt。
```

### 9.2 流程

```txt
1. 校验用户登录状态。
2. 校验 Idempotency-Key。
3. 尝试获取 Redis lock:challenge:start:{userId}。
4. 在 PostgreSQL 事务内校验是否存在 active ranked attempt。
5. 读取 Game / GameDifficulty / RuleSetVersion / ChallengePolicy 当前 ACTIVE 版本。
6. 调用 GameAdapter.startAttempt 生成 seed / puzzleVersion / initialState。
7. INSERT GameAttempt(status = CREATED)。
8. 写入 entryTokenHash、playSessionId、expiresAt。
9. 写 ChallengeAuditLog(action = START)。
10. 提交事务。
11. 返回 attemptId、entryToken、playSessionId、playPath。
```

### 9.3 数据库事务

```sql
BEGIN;

-- 依赖 partial unique index 防止并发 active attempt
INSERT INTO "GameAttempt" (
  "id",
  "userId",
  "gameId",
  "mode",
  "status",
  "difficultyId",
  "difficultyVersion",
  "ruleSetVersionId",
  "puzzleId",
  "puzzleVersionId",
  "challengePolicyId",
  "operationLogPolicyId",
  "entryTokenHash",
  "playSessionId",
  "idempotencyKey",
  "seed",
  "startedAt",
  "expiresAt",
  "createdAt",
  "updatedAt"
)
VALUES (...);

INSERT INTO "ChallengeAuditLog" (...);

COMMIT;
```

### 9.4 冲突处理

| 冲突 | 返回 |
|---|---|
| active attempt 唯一约束冲突 | `409 ACTIVE_ATTEMPT_EXISTS` |
| idempotencyKey 重复且 requestHash 相同 | 返回原 attempt |
| idempotencyKey 重复但 requestHash 不同 | `422 IDEMPOTENCY_KEY_REUSED` |
| Redis lock 获取失败 | 查询 active attempt，存在则返回 active，不存在返回 `409 START_IN_PROGRESS` |

---

## 10. claimAttempt 并发设计

### 10.1 目标

```txt
1. 防止复制 play URL 进入挑战。
2. 防止刷新后恢复正式挑战。
3. 防止多个 tab 同时 claim 同一个 attempt。
4. 防止非当前 playSessionId 进入 challenge。
```

### 10.2 流程

```txt
1. 校验用户登录状态。
2. 校验 attemptId 属于当前用户。
3. 校验 entryTokenHash。
4. 校验 playSessionId。
5. 使用条件更新推进 CREATED / CLAIMED → CLAIMED。
6. 再使用条件更新推进 CLAIMED → PLAYING。
7. 写 lastHeartbeatAt。
8. 写 ChallengeAuditLog(action = CLAIM / ENTER_PLAY)。
9. 返回 initialState / policy / expiresAt。
```

### 10.3 条件更新

```sql
UPDATE "GameAttempt"
SET
  "status" = 'CLAIMED',
  "claimedAt" = COALESCE("claimedAt", now()),
  "statusVersion" = "statusVersion" + 1,
  "updatedAt" = now()
WHERE "id" = $1
  AND "userId" = $2
  AND "entryTokenHash" = $3
  AND "playSessionId" = $4
  AND "status" IN ('CREATED', 'CLAIMED')
  AND "expiresAt" > now();
```

```sql
UPDATE "GameAttempt"
SET
  "status" = 'PLAYING',
  "playingAt" = COALESCE("playingAt", now()),
  "lastHeartbeatAt" = now(),
  "statusVersion" = "statusVersion" + 1,
  "updatedAt" = now()
WHERE "id" = $1
  AND "userId" = $2
  AND "playSessionId" = $3
  AND "status" = 'CLAIMED'
  AND "expiresAt" > now();
```

### 10.4 失败处理

| 当前状态 | claim 返回 |
|---|---|
| `COMPLETED` | `redirectTo = result` |
| `ABANDONED` | `redirectTo = expired?reason=abandoned` |
| `TIMEOUT` | `redirectTo = expired?reason=timeout` |
| `INTERRUPTED` | `redirectTo = expired?reason=interrupted` |
| `INVALIDATED` | `redirectTo = expired?reason=invalidated` |
| token 不匹配 | `403 INVALID_ENTRY_TOKEN`，并可标记 `INVALIDATED` |
| playSessionId 不匹配 | `409 SESSION_CONFLICT` |
| expiresAt 已过期 | 状态改为 `TIMEOUT` 后返回 expired |

---

## 11. heartbeat 并发设计

### 11.1 目标

```txt
1. 检测刷新、关闭、断线、崩溃。
2. 不让高频 heartbeat 压垮 PostgreSQL。
3. 不让 heartbeat 覆盖终态。
4. 不让延迟 heartbeat 把 TIMEOUT 恢复为 PLAYING。
```

### 11.2 低并发实现

在线人数小于 1000 时，heartbeat 可以直接写 PostgreSQL。

```sql
UPDATE "GameAttempt"
SET
  "lastHeartbeatAt" = now(),
  "updatedAt" = now()
WHERE "id" = $1
  AND "userId" = $2
  AND "playSessionId" = $3
  AND "status" = 'PLAYING'
  AND "expiresAt" > now();
```

### 11.3 中高并发实现

在线人数大于 1000 时，heartbeat 写 Redis。

```txt
SET heartbeat:attempt:{attemptId} {timestamp} EX 20
SET heartbeat:user:{userId}:activeAttempt {attemptId} EX 20
```

PostgreSQL 落库策略：

```txt
1. claim 时写 lastHeartbeatAt。
2. 每 N 次 heartbeat 批量刷新 lastHeartbeatAt。
3. finish / abandon / timeout 时写最终时间。
4. ReaperJob 以 Redis heartbeat 为优先判断依据，Redis 缺失时回退 DB lastHeartbeatAt。
```

### 11.4 heartbeat 返回

```ts
export type HeartbeatResponse = {
  accepted: boolean
  status: AttemptStatus
  serverNow: string
  remainingMs: number
  reason?: string
}
```

### 11.5 heartbeat 失败处理

| 条件 | 处理 |
|---|---|
| attempt 不存在 | `404` |
| userId 不匹配 | `403` |
| playSessionId 不匹配 | `409 SESSION_CONFLICT` |
| status 不是 `PLAYING` | 返回当前状态 |
| expiresAt 已过期 | CAS 更新为 `TIMEOUT` |
| Redis 不可用 | 降级写 PostgreSQL |

---

## 12. abandonAttempt 并发设计

### 12.1 目标

```txt
1. 用户主动离开时立即使正式挑战失效。
2. abandon 与 finish 同时发生时不覆盖已完成结果。
3. abandon 允许重复调用。
4. pagehide sendBeacon 只作为兜底，不作为唯一依据。
```

### 12.2 条件更新

```sql
UPDATE "GameAttempt"
SET
  "status" = 'ABANDONED',
  "abandonedAt" = now(),
  "abandonReason" = $reason,
  "statusVersion" = "statusVersion" + 1,
  "updatedAt" = now()
WHERE "id" = $attemptId
  AND "userId" = $userId
  AND "playSessionId" = $playSessionId
  AND "status" IN ('CREATED', 'CLAIMED', 'PLAYING');
```

### 12.3 幂等返回

| 当前状态 | 返回 |
|---|---|
| `ABANDONED` | accepted = true |
| `COMPLETED` | accepted = false，status = COMPLETED |
| `SUBMITTING` | accepted = false，status = SUBMITTING |
| `TIMEOUT` | accepted = false，status = TIMEOUT |
| `INTERRUPTED` | accepted = false，status = INTERRUPTED |
| `INVALIDATED` | accepted = false，status = INVALIDATED |

---

## 13. finishAttempt 并发设计

### 13.1 目标

```txt
1. 一个 attempt 只能完成一次。
2. finish 与 abandon / timeout / interrupted 同时发生时只允许一个状态获胜。
3. 排行榜写入和 attempt 完成保持事务一致。
4. 游戏验证失败时写入 INVALIDATED 或 REVIEW_REQUIRED。
5. finish 接口支持重复提交幂等返回。
```

### 13.2 流程

```txt
1. 获取 Redis lock:challenge:finish:{attemptId}。
2. 开启 PostgreSQL 事务。
3. 条件更新 PLAYING → SUBMITTING。
4. affected rows = 0 时读取当前状态并返回。
5. 读取 attempt 绑定的 puzzleVersion / ruleSetVersion / difficultyVersion。
6. 读取必要操作日志。
7. 调用 game-engine 做服务端权威验证。
8. 验证成功：写 finalState、metrics、durationMs。
9. 写 ScoreRecord。
10. upsert LeaderboardBest。
11. 写 ChallengeAuditLog。
12. 更新 SUBMITTING → COMPLETED。
13. 提交事务。
14. 投递 leaderboard refresh job。
15. 释放 Redis lock。
```

### 13.3 抢占提交权

```sql
UPDATE "GameAttempt"
SET
  "status" = 'SUBMITTING',
  "submittedAt" = now(),
  "validationStatus" = 'VALIDATING',
  "statusVersion" = "statusVersion" + 1,
  "updatedAt" = now()
WHERE "id" = $attemptId
  AND "userId" = $userId
  AND "playSessionId" = $playSessionId
  AND "status" = 'PLAYING'
  AND "expiresAt" > now();
```

### 13.4 完成写入

```sql
UPDATE "GameAttempt"
SET
  "status" = 'COMPLETED',
  "completedAt" = now(),
  "durationMs" = $durationMs,
  "rankEligible" = $rankEligible,
  "validationStatus" = 'VALID',
  "finalState" = $finalState,
  "metrics" = $metrics,
  "statusVersion" = "statusVersion" + 1,
  "updatedAt" = now()
WHERE "id" = $attemptId
  AND "status" = 'SUBMITTING';
```

### 13.5 验证失败

```sql
UPDATE "GameAttempt"
SET
  "status" = 'INVALIDATED',
  "invalidatedAt" = now(),
  "validationStatus" = 'INVALID',
  "invalidReason" = $reason,
  "statusVersion" = "statusVersion" + 1,
  "updatedAt" = now()
WHERE "id" = $attemptId
  AND "status" = 'SUBMITTING';
```

### 13.6 服务异常

服务异常时不直接回滚到 `PLAYING`。

```txt
1. 如果事务还未提交 SUBMITTING，则请求失败后 attempt 仍为 PLAYING。
2. 如果 attempt 已进入 SUBMITTING，但验证服务异常，则更新为 REVIEW_REQUIRED。
3. ChallengeReaperJob 扫描长时间 SUBMITTING 的 attempt。
4. 管理后台允许人工重跑验证或撤销。
```

### 13.7 finish 与 abandon 竞争

| 先成功状态迁移 | 后续请求处理 |
|---|---|
| `PLAYING → SUBMITTING` | abandon 返回 `SUBMITTING`，不能覆盖 |
| `PLAYING → ABANDONED` | finish 返回 `ABANDONED`，不能提交 |
| `PLAYING → TIMEOUT` | finish 返回 `TIMEOUT`，不能入榜 |
| `PLAYING → INTERRUPTED` | finish 返回 `INTERRUPTED`，不能入榜 |

---

## 14. 实时提交接口并发设计

### 14.1 适用游戏

```txt
1. life-game：区域提交
2. precise-character-building：回合提交
3. absolute-command：方向指令提交
4. 未来需要服务端逐步校验的游戏
```

### 14.2 通用校验

所有实时提交接口必须校验：

```txt
1. userId 匹配
2. attemptId 存在
3. playSessionId 匹配
4. status = PLAYING
5. expiresAt > now
6. puzzleVersionId 匹配 attempt 绑定版本
7. seq / roundIndex / regionId 未违反唯一约束
```

### 14.3 区域提交幂等

```sql
CREATE UNIQUE INDEX uq_life_region_submission
ON "LifeRegionSubmission" ("attemptId", "regionId");
```

重复提交策略：

```txt
1. 如果 payloadHash 相同，返回历史结果。
2. 如果 payloadHash 不同，返回 409 REGION_ALREADY_SUBMITTED。
3. 管理后台可查看重复提交记录。
```

### 14.4 回合提交幂等

```sql
CREATE UNIQUE INDEX uq_precise_round_submission
ON "PreciseCharacterRoundSubmission" ("attemptId", "roundIndex");
```

重复提交策略：

```txt
1. 同 roundIndex 只允许一次有效提交。
2. 客户端重试同 payload 返回同结果。
3. 不同 payload 返回 409 ROUND_ALREADY_SUBMITTED。
```

### 14.5 指令日志并发

```sql
CREATE UNIQUE INDEX uq_absolute_command_seq
ON "AttemptOperationLog" ("attemptId", "seq");
```

提交策略：

```txt
1. 每条指令携带 seq。
2. 服务端要求 seq 连续。
3. 重复 seq + 相同 payloadHash 返回历史结果。
4. 重复 seq + 不同 payloadHash 标记 INVALIDATED 或 REVIEW_REQUIRED。
5. 允许批量提交连续 seq。
```

---

## 15. 操作日志高并发设计

### 15.1 记录模式

后台为每个游戏配置 `OperationLogPolicy`。

```prisma
model OperationLogPolicy {
  id              String      @id @default(cuid())
  gameId          String
  key             String
  mode            OperationLogMode
  batchSize       Int         @default(20)
  checkpointEvery Int?        
  retainDays      Int         @default(30)
  status          ConfigStatus @default(ACTIVE)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([gameId, key, status])
}

enum OperationLogMode {
  NONE
  SUMMARY
  EVENT
  BATCHED
  FULL
}
```

### 15.2 模式含义

| 模式 | 写入内容 | 适用场景 |
|---|---|---|
| `NONE` | 不记录操作 | 练习模式、无反作弊要求游戏 |
| `SUMMARY` | 只记录统计摘要 | 低风险游戏 |
| `EVENT` | 每个操作独立写入 | 操作量较低游戏 |
| `BATCHED` | 客户端批量提交操作 | 默认正式挑战 |
| `FULL` | 操作 + checkpoint snapshot | 高反作弊要求游戏 |

### 15.3 批量写入接口

```http
POST /api/challenges/:attemptId/operations/batch
```

请求：

```ts
export type SubmitOperationBatchRequest = {
  playSessionId: string
  batchId: string
  startSeq: number
  endSeq: number
  operations: Array<{
    seq: number
    type: string
    payload: unknown
    clientTs: string
  }>
}
```

### 15.4 批量写入规则

```txt
1. batchId 必须唯一。
2. startSeq / endSeq 必须和 operations 对齐。
3. operations.seq 必须连续。
4. seq 不允许跳跃。
5. 重复 batchId 返回历史写入结果。
6. 重复 seq 且 payload 不一致，标记 attempt REVIEW_REQUIRED。
7. attempt 非 PLAYING 时拒绝写入。
```

### 15.5 高并发落库策略

低并发：

```txt
API 直接批量 insert PostgreSQL。
```

中高并发：

```txt
1. API 校验状态。
2. API 将 batch 写入 Redis Stream / BullMQ。
3. OperationLogFlushWorker 批量 insert PostgreSQL。
4. finishAttempt 前调用 flushAttemptOperations(attemptId)。
5. flush 超时则 attempt 进入 REVIEW_REQUIRED。
```

### 15.6 checkpoint 策略

```txt
1. FULL 模式每 N 步写 AttemptSnapshot。
2. N 由 operationLogPolicy.checkpointEvery 控制。
3. 默认 N = 20。
4. finish 时必须写 FINAL snapshot。
5. abandon / timeout / interrupted 时不强制写 FINAL snapshot。
```

---

## 16. 排行榜并发设计

### 16.1 目标

```txt
1. 大量玩家同时完成挑战时不重复入榜。
2. 同一用户只保留最佳成绩时必须原子比较。
3. 排行榜展示前 N 名由后台可配置。
4. 排行榜读取不能压垮 PostgreSQL。
5. ScoreRecord 是事实源，RankCache 是展示缓存。
```

### 16.2 写入层级

```txt
ScoreRecord：每次有效成绩。
LeaderboardBest：每用户每榜最佳成绩物化。
LeaderboardRankCache：前台展示缓存。
```

### 16.3 finish 事务内写入

```txt
1. 根据 attempt 绑定的 leaderboardDefinitionIds 匹配榜单。
2. INSERT ScoreRecord。
3. UPSERT LeaderboardBest。
4. 提交事务。
5. 投递 LeaderboardRefreshJob。
```

### 16.4 ScoreRecord 插入

```sql
INSERT INTO "ScoreRecord" (
  "leaderboardId",
  "periodId",
  "userId",
  "attemptId",
  "rankValue",
  "tieValue1",
  "tieValue2",
  "tieValue3",
  "metrics",
  "status",
  "submittedAt"
)
VALUES (...)
ON CONFLICT ("leaderboardId", "attemptId") DO NOTHING;
```

### 16.5 LeaderboardBest 更新

升序榜：

```sql
INSERT INTO "LeaderboardBest" (
  "leaderboardId",
  "periodId",
  "userId",
  "scoreRecordId",
  "attemptId",
  "rankValue",
  "tieValue1",
  "tieValue2",
  "tieValue3",
  "updatedAt"
)
VALUES (...)
ON CONFLICT ("leaderboardId", "periodId", "userId")
DO UPDATE SET
  "scoreRecordId" = EXCLUDED."scoreRecordId",
  "attemptId" = EXCLUDED."attemptId",
  "rankValue" = EXCLUDED."rankValue",
  "tieValue1" = EXCLUDED."tieValue1",
  "tieValue2" = EXCLUDED."tieValue2",
  "tieValue3" = EXCLUDED."tieValue3",
  "updatedAt" = now()
WHERE
  EXCLUDED."rankValue" < "LeaderboardBest"."rankValue"
  OR (
    EXCLUDED."rankValue" = "LeaderboardBest"."rankValue"
    AND COALESCE(EXCLUDED."tieValue1", 0) < COALESCE("LeaderboardBest"."tieValue1", 0)
  )
  OR (
    EXCLUDED."rankValue" = "LeaderboardBest"."rankValue"
    AND COALESCE(EXCLUDED."tieValue1", 0) = COALESCE("LeaderboardBest"."tieValue1", 0)
    AND COALESCE(EXCLUDED."tieValue2", 0) < COALESCE("LeaderboardBest"."tieValue2", 0)
  );
```

降序榜将比较符号反向。

### 16.6 RankCache 刷新

```txt
1. finish 后不在用户请求内重算完整榜单。
2. finish 后写 Redis 去重 key：leaderboard:refresh-dedup:{leaderboardId}:{periodId}。
3. 去重成功才投递 BullMQ job。
4. Worker 读取 LeaderboardBest 前 displayLimit 名。
5. Worker 删除旧 LeaderboardRankCache。
6. Worker 插入新缓存。
7. Redis 中同步写榜单 JSON 缓存。
```

### 16.7 榜单展示数量

后台配置：

```prisma
model LeaderboardDisplayPolicy {
  id              String    @id @default(cuid())
  leaderboardId   String
  displayLimit    Int       @default(100)
  cacheTtlSeconds Int       @default(10)
  showUserRank    Boolean   @default(true)
  status          ConfigStatus @default(ACTIVE)
  updatedAt       DateTime  @updatedAt
}
```

读取规则：

```txt
1. 先读 Redis leaderboard:rank:{leaderboardId}:{periodId}。
2. Redis miss 时读 LeaderboardRankCache。
3. RankCache miss 时读 LeaderboardBest 并同步生成缓存。
4. 前台只展示 displayLimit 名。
5. 用户个人名次可单独查询，不强制展示全榜。
```

---

## 17. 后台配置发布并发设计

### 17.1 目标

```txt
1. 管理员并发发布配置时只允许一个 ACTIVE 版本。
2. 玩家已开始挑战后不受新配置影响。
3. 发布失败不能留下半发布状态。
4. 配置发布必须写审计日志。
```

### 17.2 发布事务

```txt
BEGIN;

1. SELECT Game FOR UPDATE。
2. 校验管理员权限。
3. 校验新版本 validationStatus = VALID。
4. 当前 ACTIVE → ARCHIVED。
5. 目标 DRAFT / REVIEWED → ACTIVE。
6. 写 AdminAuditLog。
7. 写 ConfigPublishLog。

COMMIT;
```

### 17.3 题目版本发布

```sql
BEGIN;

SELECT * FROM "Puzzle"
WHERE "id" = $puzzleId
FOR UPDATE;

UPDATE "PuzzleVersion"
SET "status" = 'ARCHIVED'
WHERE "puzzleId" = $puzzleId
  AND "status" = 'ACTIVE';

UPDATE "PuzzleVersion"
SET
  "status" = 'ACTIVE',
  "publishedAt" = now()
WHERE "id" = $targetVersionId
  AND "puzzleId" = $puzzleId
  AND "validationStatus" = 'VALID';

UPDATE "Puzzle"
SET
  "currentVersionId" = $targetVersionId,
  "updatedAt" = now()
WHERE "id" = $puzzleId;

COMMIT;
```

### 17.4 发布冲突处理

| 冲突 | 处理 |
|---|---|
| ACTIVE 唯一约束冲突 | 回滚并提示重新加载配置 |
| version 不是最新 | 返回 `409 VERSION_CONFLICT` |
| validationStatus 非 VALID | 返回 `422 VERSION_NOT_VALIDATED` |
| 已有挑战使用旧版本 | 不影响旧挑战，旧版本保持可读不可编辑 |

---

## 18. ChallengeReaperJob 设计

### 18.1 职责

```txt
1. CREATED 超过 claim 等待时间 → INTERRUPTED。
2. CLAIMED 超过进入 PLAYING 等待时间 → INTERRUPTED。
3. PLAYING 超过 expiresAt → TIMEOUT。
4. PLAYING heartbeat 过期 → INTERRUPTED。
5. SUBMITTING 卡住超过阈值 → REVIEW_REQUIRED。
6. Redis heartbeat 与 PostgreSQL 状态不一致时修复。
```

### 18.2 扫描 SQL

```sql
SELECT "id"
FROM "GameAttempt"
WHERE "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING')
  AND (
    "expiresAt" < now()
    OR "lastHeartbeatAt" < now() - interval '20 seconds'
    OR ("status" = 'SUBMITTING' AND "submittedAt" < now() - interval '60 seconds')
  )
ORDER BY "updatedAt" ASC
FOR UPDATE SKIP LOCKED
LIMIT 500;
```

### 18.3 Worker 并发

```txt
1. 多个 ChallengeReaperWorker 可以并行运行。
2. 使用 FOR UPDATE SKIP LOCKED 避免重复处理。
3. 每批最多 500 条。
4. 每 10 秒执行一次。
5. 单条处理失败不影响整批。
```

### 18.4 状态修复规则

| 当前状态 | 条件 | 新状态 |
|---|---|---|
| `CREATED` | createdAt 超过 60 秒未 claim | `INTERRUPTED` |
| `CLAIMED` | claimedAt 超过 30 秒未 PLAYING | `INTERRUPTED` |
| `PLAYING` | expiresAt < now | `TIMEOUT` |
| `PLAYING` | heartbeat 过期 | `INTERRUPTED` |
| `SUBMITTING` | submittedAt 超过 60 秒 | `REVIEW_REQUIRED` |

---

## 19. Worker 队列设计

### 19.1 BullMQ 队列

```txt
challenge-reaper-queue
leaderboard-refresh-queue
operation-log-flush-queue
data-retention-queue
audit-log-queue
```

### 19.2 通用 Worker 配置

```ts
export const workerDefaults = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 10000,
  removeOnFail: 50000,
}
```

### 19.3 LeaderboardRefreshWorker

```txt
1. Job key 使用 leaderboardId + periodId 去重。
2. Worker 获取 lock:leaderboard:refresh:{leaderboardId}:{periodId}。
3. 查询 LeaderboardDisplayPolicy.displayLimit。
4. 查询 LeaderboardBest 前 N 名。
5. 写 LeaderboardRankCache。
6. 写 Redis 缓存。
7. 释放锁。
```

### 19.4 OperationLogFlushWorker

```txt
1. 从 Redis Stream / BullMQ 读取 operation batch。
2. 按 attemptId 分组。
3. 批量 insert AttemptOperationLog。
4. 遇到唯一约束冲突时做幂等判断。
5. payloadHash 不一致时标记 attempt REVIEW_REQUIRED。
6. 写入 AttemptOperationBatch 状态。
```

### 19.5 DataRetentionWorker

```txt
1. 每日低峰执行。
2. 按分区归档历史日志。
3. 删除过期 Redis cache。
4. 压缩历史 operation log。
5. 清理过期 IdempotencyRecord。
6. 生成数据保留报告。
```

---

## 20. 数据分区与清理

### 20.1 分区表

以下表按月分区：

```txt
AttemptOperationLog
AttemptOperationBatch
AttemptSnapshot
ChallengeAuditLog
AdminAuditLog
ScoreRecord
GameSubmission
```

### 20.2 分区命名

```txt
AttemptOperationLog_2026_05
AttemptOperationLog_2026_06
ScoreRecord_2026_05
ChallengeAuditLog_2026_05
```

### 20.3 保留策略

| 数据 | 热数据保留 | 冷归档 | 删除策略 |
|---|---:|---:|---|
| `GameAttempt` | 永久保留核心记录 | 不归档 | 不删除 |
| `ScoreRecord` | 12 个月 | 长期归档 | 不删除有效成绩 |
| `LeaderboardBest` | 永久保留 | 不归档 | 成绩撤销时软删除 |
| `LeaderboardRankCache` | 当前展示缓存 | 不归档 | 过期重建 |
| `AttemptOperationLog` | 30~90 天 | 180~365 天 | 超期删除或对象存储 |
| `AttemptSnapshot` | 30~90 天 | 180~365 天 | 超期删除或对象存储 |
| `ChallengeAuditLog` | 180 天 | 365 天 | 超期归档 |
| `AdminAuditLog` | 365 天 | 长期归档 | 不直接删除 |
| `IdempotencyRecord` | 1~7 天 | 不归档 | 直接删除 |
| Redis heartbeat | 20~60 秒 | 不归档 | TTL 自动删除 |
| Redis lock | 3~30 秒 | 不归档 | TTL 自动删除 |
| Redis leaderboard cache | 10~60 秒 | 不归档 | TTL 自动删除 |

### 20.4 归档方式

```txt
1. 热数据保留在 PostgreSQL 主表。
2. 冷数据按月导出为 gzip JSONL 或 parquet。
3. 归档文件保存到对象存储或服务器归档目录。
4. 归档元数据写 ArchiveManifest。
5. 删除分区前必须确认 ArchiveManifest.status = VERIFIED。
```

### 20.5 ArchiveManifest

```prisma
model ArchiveManifest {
  id              String      @id @default(cuid())
  tableName       String
  partitionName   String
  rangeStart      DateTime
  rangeEnd        DateTime
  filePath        String
  fileHash        String
  rowCount        Int
  status          ArchiveStatus @default(CREATED)
  createdAt       DateTime    @default(now())
  verifiedAt      DateTime?

  @@unique([tableName, partitionName])
  @@index([status, createdAt])
}

enum ArchiveStatus {
  CREATED
  EXPORTED
  VERIFIED
  DELETED
  FAILED
}
```

---

## 21. 限流设计

### 21.1 限流维度

| 接口 | 限流维度 | 建议 |
|---|---|---|
| `POST /auth/login` | IP + username | 5 次 / 分钟 |
| `POST /api/challenges/start` | userId | 10 次 / 分钟 |
| `POST /api/challenges/:id/claim` | attemptId + userId | 20 次 / 分钟 |
| `POST /api/challenges/:id/heartbeat` | attemptId | 1 次 / 3 秒 |
| `POST /api/challenges/:id/abandon` | attemptId | 10 次 / 分钟 |
| `POST /api/challenges/:id/finish` | attemptId | 5 次 / 分钟 |
| `POST /api/challenges/:id/operations/batch` | attemptId | 30 次 / 分钟 |
| `GET /api/leaderboards/:id` | IP + leaderboardId | 120 次 / 分钟 |
| 后台写接口 | adminUserId + IP | 30 次 / 分钟 |

### 21.2 限流实现

```txt
1. 使用 NestJS ThrottlerGuard。
2. Storage 使用 Redis。
3. 登录接口额外记录失败次数。
4. finish / start 超限返回 429。
5. heartbeat 超限不改变 attempt 状态，只返回 429。
6. operation batch 超限时客户端应延迟重试。
```

---

## 22. 缓存设计

### 22.1 可缓存数据

```txt
1. 游戏列表
2. 游戏详情
3. 已发布题目列表
4. LeaderboardRankCache
5. 用户当前 active attempt 状态短缓存
6. 后台只读配置
```

### 22.2 不缓存或短缓存数据

```txt
1. finishAttempt 结果：只允许幂等短缓存
2. claimAttempt 结果：不缓存
3. heartbeat：不缓存
4. admin publish：不缓存
5. 用户权限：短缓存，权限变更后主动失效
```

### 22.3 榜单缓存 TTL

```txt
低并发：10 秒
中并发：5 秒
高并发：1~3 秒 + 异步刷新
```

### 22.4 缓存失效

```txt
1. finish 成功后投递 refresh job。
2. 管理员修改 displayLimit 后删除 leaderboard cache。
3. 管理员撤销成绩后删除 leaderboard cache。
4. period 结束时锁定缓存快照。
```

---

## 23. PostgreSQL 连接池设计

### 23.1 生产连接方式

```txt
NestJS API → PgBouncer → PostgreSQL
Worker → PgBouncer → PostgreSQL
Admin scripts → PostgreSQL direct / PgBouncer transaction mode
```

### 23.2 Prisma 连接参数

```env
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/brain_games?connection_limit=10&pool_timeout=10"
```

### 23.3 连接数规划

```txt
PostgreSQL max_connections = 200
API 实例数 = 8
每实例 Prisma connection_limit = 10
API 总连接 = 80
Worker 实例数 = 4
每 Worker connection_limit = 10
Worker 总连接 = 40
预留连接 = 80
```

### 23.4 事务要求

```txt
1. 用户请求事务必须短。
2. 不允许在事务中等待外部网络请求。
3. game-engine 本地验证可在事务内执行；如果验证耗时过长，应先抢占 SUBMITTING，再事务外验证，最后用短事务写结果。
4. 大型排行榜刷新不在用户请求事务内执行。
```

---

## 24. 大型验证任务处理

### 24.1 同步验证

适用：

```txt
1. 华容道重放
2. 简单答案比对
3. 精准造字单轮查表
4. 验证耗时 < 300ms
```

流程：

```txt
finish 请求内完成验证并返回结果。
```

### 24.2 异步验证

适用：

```txt
1. 3D 迷宫复杂回放
2. 大型操作日志验证
3. 需要多步骤模拟的游戏
4. 验证耗时 > 300ms
```

流程：

```txt
1. finish 抢占 PLAYING → SUBMITTING。
2. 写 ValidationJob。
3. 返回 status = SUBMITTING。
4. ValidationWorker 执行 game-engine 验证。
5. 验证完成后写 COMPLETED / INVALIDATED。
6. 前端 result 页面轮询 status 或通过 WebSocket/SSE 获取结果。
```

### 24.3 异步验证表

```prisma
model AttemptValidationJob {
  id              String      @id @default(cuid())
  attemptId       String      @unique
  status          JobStatus   @default(PENDING)
  attempts        Int         @default(0)
  lastError       String?
  lockedAt        DateTime?
  completedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([status, createdAt])
}

enum JobStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  REVIEW_REQUIRED
}
```

---

## 25. 后台管理并发设计

### 25.1 管理员写操作统一规则

```txt
1. 所有写操作必须带 Idempotency-Key。
2. 所有写操作必须写 AdminAuditLog。
3. 所有配置型资源必须有 version。
4. 发布操作必须使用事务。
5. 删除操作默认软删除。
6. 正在被历史 attempt 引用的版本禁止物理删除。
```

### 25.2 管理员强制终止 attempt

```txt
1. 只能终止 CREATED / CLAIMED / PLAYING / SUBMITTING。
2. COMPLETED 不允许终止，只允许撤销成绩。
3. 终止操作写 ChallengeAuditLog。
4. 终止后 ScoreRecord 不生成。
```

SQL：

```sql
UPDATE "GameAttempt"
SET
  "status" = 'INVALIDATED',
  "invalidatedAt" = now(),
  "invalidReason" = $reason,
  "updatedAt" = now()
WHERE "id" = $attemptId
  AND "status" IN ('CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING');
```

### 25.3 管理员撤销成绩

```txt
1. ScoreRecord.status → REVOKED。
2. 如果 LeaderboardBest 指向该 ScoreRecord，则重新选择该用户次优成绩。
3. 重新刷新 LeaderboardRankCache。
4. 写 AdminAuditLog。
```

---

## 26. 部署扩展方案

### 26.1 API 多实例

```txt
1. API 实例无内存状态。
2. Runtime session 状态在 PostgreSQL + Redis。
3. JWT 验证在任意实例可执行。
4. Redis 限流和锁跨实例共享。
5. BullMQ job 可由多个 Worker 处理。
```

### 26.2 水平扩容触发条件

| 指标 | 扩容条件 |
|---|---|
| API CPU | 5 分钟平均 > 70% |
| API p95 延迟 | > 300ms |
| PostgreSQL CPU | > 70% |
| Redis CPU | > 70% |
| BullMQ waiting jobs | 持续增长 5 分钟 |
| leaderboard refresh delay | > 10 秒 |
| operation log flush delay | > 30 秒 |

### 26.3 读写分离

第一阶段不启用读写分离。

当 PostgreSQL 读压力过高时：

```txt
1. 排行榜读取优先使用 Redis。
2. 游戏列表、题库列表使用 Redis cache。
3. 管理后台复杂查询使用只读副本。
4. 用户请求中的强一致查询仍读主库。
```

---

## 27. 监控指标

### 27.1 API 指标

```txt
http_requests_total
http_request_duration_seconds
challenge_start_total
challenge_claim_total
challenge_finish_total
challenge_abandon_total
challenge_heartbeat_total
challenge_finish_conflict_total
challenge_claim_conflict_total
idempotency_reuse_total
rate_limit_block_total
```

### 27.2 数据库指标

```txt
postgres_connections_active
postgres_transaction_duration_seconds
postgres_deadlocks_total
postgres_lock_wait_seconds
attempt_cas_failed_total
score_record_conflict_total
leaderboard_best_upsert_total
operation_log_insert_conflict_total
```

### 27.3 Redis 指标

```txt
redis_lock_acquire_total
redis_lock_acquire_failed_total
redis_rate_limit_total
redis_heartbeat_keys
redis_leaderboard_cache_hit_total
redis_leaderboard_cache_miss_total
```

### 27.4 Worker 指标

```txt
bullmq_jobs_waiting
bullmq_jobs_active
bullmq_jobs_failed
challenge_reaper_processed_total
leaderboard_refresh_duration_seconds
operation_log_flush_duration_seconds
data_retention_duration_seconds
```

### 27.5 业务告警

```txt
1. SUBMITTING 超过 60 秒数量 > 0。
2. REVIEW_REQUIRED 数量持续增加。
3. finish conflict rate > 5%。
4. heartbeat timeout rate 突然升高。
5. leaderboard refresh delay > 30 秒。
6. operation log flush delay > 60 秒。
7. PostgreSQL deadlock > 0。
8. Redis lock acquire failed rate 异常升高。
```

---

## 28. 压测方案

### 28.1 start 压测

目标：

```txt
验证同一用户重复 start 只产生一个 active attempt。
```

用例：

```txt
1. 同一 userId 并发 100 个 start 请求。
2. 不同 userId 并发 10000 个 start 请求。
3. 带相同 Idempotency-Key 重试。
4. 带不同 Idempotency-Key 重复点击。
```

验收：

```txt
1. 同一用户 active attempt <= 1。
2. 无重复 RANKED attempt。
3. 无数据库死锁。
4. p95 < 300ms。
```

### 28.2 claim 压测

目标：

```txt
验证同一 attempt 多 tab 并发 claim 只有一个成功。
```

用例：

```txt
同一 attemptId 并发 100 个 claim 请求。
```

验收：

```txt
1. 成功进入 PLAYING 的请求 <= 1。
2. 其他请求返回 SESSION_CONFLICT / 当前状态。
3. GameAttempt 状态正确。
```

### 28.3 finish 压测

目标：

```txt
验证重复 finish 不重复入榜。
```

用例：

```txt
同一 attemptId 并发 100 个 finish 请求。
```

验收：

```txt
1. ScoreRecord 每个 leaderboardId + attemptId 只有一条。
2. GameAttempt 最终状态只有一个。
3. LeaderboardBest 正确。
4. 其他 finish 请求返回幂等状态。
```

### 28.4 finish / abandon / timeout 竞争压测

目标：

```txt
验证终态不可覆盖。
```

用例：

```txt
同一 attemptId 并发：
1. finish
2. abandon
3. heartbeat
4. Reaper timeout
```

验收：

```txt
1. 最终状态符合状态迁移优先级。
2. COMPLETED 不被 ABANDONED 覆盖。
3. TIMEOUT 不允许入榜。
4. 无脏 ScoreRecord。
```

### 28.5 leaderboard 压测

目标：

```txt
验证大量完成挑战时榜单写入和展示稳定。
```

用例：

```txt
1 万用户 1 分钟内同时 finish。
```

验收：

```txt
1. ScoreRecord 数量正确。
2. LeaderboardBest 每用户每榜唯一。
3. RankCache 能在目标延迟内刷新。
4. 榜单读取 p95 < 100ms。
```

---

## 29. 最小落地版本

第一阶段完成：

```txt
1. GameAttempt 状态机完整迁移。
2. start 增加 Idempotency-Key。
3. RANKED / DAILY active attempt partial unique index。
4. claim 使用条件更新。
5. finish 使用 PLAYING → SUBMITTING 条件更新。
6. abandon 使用条件更新，不能覆盖 COMPLETED / SUBMITTING。
7. ScoreRecord 增加 leaderboardId + attemptId 唯一约束。
8. LeaderboardBest 使用 UPSERT。
9. ChallengeReaperJob 使用 FOR UPDATE SKIP LOCKED。
10. ChallengeAuditLog 记录状态迁移。
11. operation log 增加 attemptId + seq 唯一约束。
12. Redis lock 用于 start / claim / finish 降低并发冲突。
```

第二阶段完成：

```txt
1. heartbeat 切换为 Redis heartbeat。
2. LeaderboardRankCache + Redis 榜单缓存。
3. BullMQ LeaderboardRefreshWorker。
4. OperationLog 批量提交。
5. OperationLog 分区表。
6. IdempotencyRecord 清理任务。
7. 数据归档 ArchiveManifest。
```

第三阶段完成：

```txt
1. 异步大型验证任务。
2. Redis Stream / BullMQ 操作日志削峰。
3. PostgreSQL 读副本接入管理后台查询。
4. 更细粒度管理员配置发布锁。
5. 自动压测脚本纳入 CI。
```

---

## 30. 禁止方案

```txt
1. 禁止只依赖前端按钮禁用防重复提交。
2. 禁止只依赖 Redis 锁保证 attempt 状态正确。
3. 禁止在 /play 页面 mount 时自动 start attempt。
4. 禁止 finish 前不抢占 SUBMITTING。
5. 禁止 abandon 覆盖 SUBMITTING / COMPLETED。
6. 禁止 timeout 后继续入榜。
7. 禁止排行榜在用户请求内重算全榜。
8. 禁止把所有操作轨迹直接塞入 GameAttempt.moveTrace。
9. 禁止后台修改配置后让历史 attempt 读取 currentVersion。
10. 禁止没有唯一约束只靠业务代码判断是否重复入榜。
11. 禁止 heartbeat 高频路径使用长事务行锁。
12. 禁止 API 实例保存挑战运行时内存状态作为判断依据。
13. 禁止物理删除已被历史 attempt 引用的 PuzzleVersion / DifficultyVersion。
14. 禁止 Worker 无锁并发处理同一 leaderboard refresh。
15. 禁止 Redis 不可用时直接产生不可恢复的不一致状态。
```
