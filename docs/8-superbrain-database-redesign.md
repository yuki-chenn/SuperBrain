# SuperBrain 数据库重构设计文档

## 1. 设计目标

数据库重构后必须满足以下目标：

```txt
1. 支持多游戏长期扩展，新增游戏时不修改核心挑战表结构。
2. 支持后台配置题库、难度、规则版本、排行榜和运行时策略。
3. 支持随机生成题库、人工题库、周期题库、混合题库。
4. 支持服务端权威验证和防作弊校验。
5. 支持按游戏配置是否记录玩家操作。
6. 支持挑战生命周期、路由准入、刷新失效、多标签页控制。
7. 支持一个游戏多个排行榜，一个排行榜只展示后台配置的前 N 名。
8. 支持未来扩展日榜、周榜、月榜、赛季榜、题目榜、好友榜。
9. 支持数据分层保留、归档、压缩、清理和审计追踪。
10. 支持 PostgreSQL + Prisma 的可维护实现。
```

---

## 2. 总体数据域划分

数据库按以下领域拆分：

```txt
Identity & Access
  User
  AuthSession
  Role
  Permission
  UserRole
  RolePermission

Game Catalog & Policy
  Game
  GameRuleSetVersion
  GameDifficulty
  GameContentPolicy
  GameChallengePolicy

Puzzle System
  Puzzle
  PuzzleVersion
  PuzzleSchedule
  PuzzleTag
  PuzzleTagBinding
  PuzzleAsset

Challenge Runtime
  GameAttempt
  AttemptRuntimeSession
  AttemptOperationLog
  AttemptSnapshot
  GameSubmission
  AttemptValidationReport
  ChallengeAuditLog

Leaderboard & Score
  LeaderboardDefinition
  LeaderboardPeriod
  ScoreRecord
  LeaderboardBest
  LeaderboardRankCache

Admin & Audit
  AdminAuditLog
  AdminReviewTask

Data Lifecycle
  DataRetentionPolicy
  DataArchiveBatch
  DataArchiveObject
  DataCleanupRun

Game Specific Dictionary
  CharacterRadical
  CharacterRoot
  CharacterCombination
```

---

## 3. 核心关系结构

```txt
User
 ├── AuthSession
 ├── UserRole ── Role ── RolePermission ── Permission
 ├── GameAttempt
 ├── ScoreRecord
 └── LeaderboardBest

Game
 ├── GameRuleSetVersion
 ├── GameDifficulty
 ├── GameContentPolicy
 ├── GameChallengePolicy
 ├── Puzzle
 │    ├── PuzzleVersion
 │    ├── PuzzleSchedule
 │    ├── PuzzleTagBinding ── PuzzleTag
 │    └── PuzzleAsset
 ├── GameAttempt
 │    ├── AttemptRuntimeSession
 │    ├── AttemptOperationLog
 │    ├── AttemptSnapshot
 │    ├── GameSubmission
 │    ├── AttemptValidationReport
 │    └── ChallengeAuditLog
 └── LeaderboardDefinition
      ├── LeaderboardPeriod
      ├── ScoreRecord
      ├── LeaderboardBest
      └── LeaderboardRankCache
```

---

## 4. 枚举设计

### 4.1 用户与权限枚举

```prisma
// 用户状态
enum UserStatus {
  ACTIVE
  BANNED
  DELETED
}

// 登录会话状态
enum AuthSessionStatus {
  ACTIVE
  REVOKED
  EXPIRED
  ROTATED
  COMPROMISED
}
```

### 4.2 游戏配置枚举

```prisma
// 游戏发布状态
enum GameStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DISABLED
}

// 配置状态
enum ConfigStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

// 题库内容来源模式
enum ContentMode {
  GENERATED      // 由服务端按 seed 和后台参数生成
  CURATED        // 人工题库
  SCHEDULED      // 每日、每周、每月等周期题库
  MIXED          // 人工题库 + 随机生成混合
}

// 题目选择策略
enum PuzzleSelectionStrategy {
  RANDOM
  ROUND_ROBIN
  MANUAL
  DAILY
  WEEKLY
  MONTHLY
  WEIGHTED_RANDOM
}

// 规则版本验证状态
enum ValidationStatus {
  UNVALIDATED
  VALIDATING
  VALID
  INVALID
  WARNING
}
```

### 4.3 挑战运行枚举

```prisma
// 挑战模式
enum ChallengeMode {
  RANKED
  CASUAL
  PRACTICE
  DAILY
  ROOM
  ADMIN_TEST
}

// 挑战状态
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
}

// 成绩资格状态
enum ScoreEligibility {
  NOT_ELIGIBLE
  ELIGIBLE
  RECORDED
  REVOKED
}

// 操作日志记录模式
enum OperationLogMode {
  NONE            // 不记录操作，只保存结果和验证摘要
  SUMMARY         // 只记录摘要，例如步数、命令数、错误次数
  EVENT           // 逐事件记录
  BATCHED         // 批量事件记录
  FULL            // 事件 + 周期快照 + 关键快照
}

// 快照类型
enum SnapshotType {
  INITIAL
  CHECKPOINT
  FINAL
  ERROR
  VALIDATION
  ADMIN_REVIEW
}

// 提交类型
enum SubmissionType {
  FINAL
  STEP
  ROUND
  REGION
  COMMAND
  CHECKPOINT
}
```

### 4.4 题目枚举

```prisma
// 题目状态
enum PuzzleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DISABLED
}

// 题目版本状态
enum PuzzleVersionStatus {
  DRAFT
  VALIDATING
  VALID
  INVALID
  PUBLISHED
  ARCHIVED
}

// 周期题目粒度
enum ScheduleGranularity {
  DAILY
  WEEKLY
  MONTHLY
  SEASONAL
  CUSTOM
}
```

### 4.5 排行榜枚举

```prisma
// 排行榜范围
enum LeaderboardScope {
  GLOBAL
  DAILY
  WEEKLY
  MONTHLY
  SEASONAL
  PUZZLE
  FRIENDS
}

// 周期类型
enum LeaderboardPeriodType {
  ALL_TIME
  DAILY
  WEEKLY
  MONTHLY
  SEASONAL
  CUSTOM
}

// 排序方向
enum RankDirection {
  ASC
  DESC
}

// 排行榜记录策略
enum EntryPolicy {
  BEST_PER_USER
  ALL_ATTEMPTS
}

// 成绩记录状态
enum ScoreRecordStatus {
  ACTIVE
  HIDDEN
  REVOKED
  ARCHIVED
}
```

### 4.6 数据清理枚举

```prisma
// 数据清理动作
enum RetentionAction {
  KEEP
  COMPACT
  ARCHIVE
  DELETE
  ANONYMIZE
}

// 归档对象格式
enum ArchiveFormat {
  JSONL_GZIP
  PARQUET
  CSV_GZIP
}

// 清理任务状态
enum CleanupRunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  PARTIAL_FAILED
}
```

---

## 5. 表设计总览

| 数据域 | 表 | 用途 |
|---|---|---|
| Identity | `User` | 用户基础信息 |
| Identity | `AuthSession` | 登录会话、Refresh Token 轮换 |
| Identity | `Role` | 管理后台角色 |
| Identity | `Permission` | 权限点 |
| Identity | `UserRole` | 用户角色绑定 |
| Identity | `RolePermission` | 角色权限绑定 |
| Game | `Game` | 游戏目录 |
| Game | `GameRuleSetVersion` | 游戏规则版本 |
| Game | `GameDifficulty` | 难度配置版本 |
| Game | `GameContentPolicy` | 题库来源和选择策略 |
| Game | `GameChallengePolicy` | 挑战运行策略 |
| Puzzle | `Puzzle` | 通用题目元信息 |
| Puzzle | `PuzzleVersion` | 通用题目版本内容 |
| Puzzle | `PuzzleSchedule` | 周期题目排期 |
| Puzzle | `PuzzleTag` | 题目标签 |
| Puzzle | `PuzzleTagBinding` | 题目标签绑定 |
| Puzzle | `PuzzleAsset` | 题目资源文件 |
| Attempt | `GameAttempt` | 挑战主记录 |
| Attempt | `AttemptRuntimeSession` | 挑战运行会话 |
| Attempt | `AttemptOperationLog` | 玩家操作日志 |
| Attempt | `AttemptSnapshot` | 挑战状态快照 |
| Attempt | `GameSubmission` | 玩家提交记录 |
| Attempt | `AttemptValidationReport` | 服务端验证报告 |
| Attempt | `ChallengeAuditLog` | 挑战状态审计 |
| Leaderboard | `LeaderboardDefinition` | 排行榜定义 |
| Leaderboard | `LeaderboardPeriod` | 排行榜周期 |
| Leaderboard | `ScoreRecord` | 成绩记录 |
| Leaderboard | `LeaderboardBest` | 每用户最佳成绩物化 |
| Leaderboard | `LeaderboardRankCache` | 前 N 名展示缓存 |
| Admin | `AdminAuditLog` | 管理员操作审计 |
| Admin | `AdminReviewTask` | 后台审核任务 |
| Lifecycle | `DataRetentionPolicy` | 数据保留策略 |
| Lifecycle | `DataArchiveBatch` | 归档批次 |
| Lifecycle | `DataArchiveObject` | 归档对象元数据 |
| Lifecycle | `DataCleanupRun` | 清理任务执行记录 |
| Dictionary | `CharacterRadical` | 精准造字部首字典 |
| Dictionary | `CharacterRoot` | 精准造字字根字典 |
| Dictionary | `CharacterCombination` | 精准造字组合规则 |

---

# 6. Identity & Access 表设计

## 6.1 User

### 设计要求

```txt
1. 用户表只保存用户身份、展示信息和账号状态。
2. 不在 User 表中直接保存单一 role 字段作为最终权限来源。
3. 权限判断必须通过 Role / Permission 体系完成。
4. 删除账号时使用 DELETED 状态，并按数据保留策略进行匿名化。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 用户 ID |
| `email` | `String` | 是 | - | 邮箱，唯一 |
| `username` | `String` | 是 | - | 用户名，唯一 |
| `displayName` | `String?` | 否 | `null` | 展示名称 |
| `passwordHash` | `String` | 是 | - | 密码哈希，使用 `argon2id` |
| `avatarUrl` | `String?` | 否 | `null` | 头像 URL |
| `status` | `UserStatus` | 是 | `ACTIVE` | 用户状态 |
| `lastLoginAt` | `DateTime?` | 否 | `null` | 最后登录时间 |
| `deletedAt` | `DateTime?` | 否 | `null` | 账号删除时间 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([email])
@@unique([username])
@@index([status])
@@index([createdAt])
```

---

## 6.2 AuthSession

### 设计要求

```txt
1. 保存 Refresh Token 的哈希，不保存明文 token。
2. 支持 token family 轮换和重放检测。
3. 支持后台强制下线和用户主动登出。
4. 过期 session 定期清理。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 会话 ID |
| `userId` | `String` | 是 | - | 用户 ID |
| `refreshTokenHash` | `String` | 是 | - | Refresh Token 哈希，唯一 |
| `refreshTokenFamilyId` | `String` | 是 | - | Token 家族 ID |
| `status` | `AuthSessionStatus` | 是 | `ACTIVE` | 会话状态 |
| `userAgent` | `String?` | 否 | `null` | User-Agent |
| `ipAddress` | `String?` | 否 | `null` | IP 地址 |
| `expiresAt` | `DateTime` | 是 | - | 过期时间 |
| `lastUsedAt` | `DateTime?` | 否 | `null` | 最后使用时间 |
| `revokedAt` | `DateTime?` | 否 | `null` | 撤销时间 |
| `revokedReason` | `String?` | 否 | `null` | 撤销原因 |
| `replacedBySessionId` | `String?` | 否 | `null` | 轮换后的新 session |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([refreshTokenHash])
@@index([userId, status])
@@index([refreshTokenFamilyId])
@@index([expiresAt])
@@index([status, expiresAt])
```

---

## 6.3 Role

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 角色 ID |
| `key` | `String` | 是 | - | 角色键，如 `super_admin` |
| `name` | `String` | 是 | - | 角色名称 |
| `description` | `String?` | 否 | `null` | 角色说明 |
| `isSystem` | `Boolean` | 是 | `false` | 是否系统内置角色 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([key])
@@index([isSystem])
```

### 默认角色

```txt
super_admin
admin
puzzle_editor
puzzle_reviewer
leaderboard_manager
user_manager
audit_viewer
readonly_operator
```

---

## 6.4 Permission

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 权限 ID |
| `key` | `String` | 是 | - | 权限键，如 `game:update` |
| `resource` | `String` | 是 | - | 资源类型，如 `game` |
| `action` | `String` | 是 | - | 动作，如 `create/update/delete/publish` |
| `description` | `String?` | 否 | `null` | 权限说明 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([key])
@@index([resource, action])
```

---

## 6.5 UserRole

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `userId` | `String` | 是 | - | 用户 ID |
| `roleId` | `String` | 是 | - | 角色 ID |
| `assignedByUserId` | `String?` | 否 | `null` | 分配人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@id([userId, roleId])
@@index([roleId])
@@index([assignedByUserId])
```

---

## 6.6 RolePermission

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `roleId` | `String` | 是 | - | 角色 ID |
| `permissionId` | `String` | 是 | - | 权限 ID |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@id([roleId, permissionId])
@@index([permissionId])
```

---

# 7. Game Catalog & Policy 表设计

## 7.1 Game

### 设计要求

```txt
1. Game 只保存游戏目录级信息，不保存难度数组。
2. 游戏难度、规则、题库来源、挑战策略全部拆到独立表。
3. Game.slug 是前端路由、API、后台管理的稳定业务键。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 游戏 ID |
| `slug` | `String` | 是 | - | 游戏唯一标识，如 `sliding-puzzle` |
| `title` | `String` | 是 | - | 游戏标题 |
| `subtitle` | `String?` | 否 | `null` | 副标题 |
| `description` | `String` | 是 | - | 游戏描述 |
| `source` | `String?` | 否 | `null` | 来源说明 |
| `coverUrl` | `String?` | 否 | `null` | 封面 URL |
| `status` | `GameStatus` | 是 | `DRAFT` | 游戏状态 |
| `sortOrder` | `Int` | 是 | `0` | 前台展示排序 |
| `metadata` | `Json` | 是 | `{}` | 非核心扩展信息 |
| `publishedAt` | `DateTime?` | 否 | `null` | 发布时间 |
| `archivedAt` | `DateTime?` | 否 | `null` | 归档时间 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([slug])
@@index([status, sortOrder])
@@index([publishedAt])
```

---

## 7.2 GameRuleSetVersion

### 设计要求

```txt
1. 规则版本必须不可变。
2. 挑战开始时绑定具体 ruleSetVersionId。
3. 后台修改规则时创建新版本，不覆盖旧版本。
4. 历史挑战必须能够还原当时使用的规则。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 规则版本 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `version` | `Int` | 是 | - | 版本号，从 1 递增 |
| `name` | `String` | 是 | - | 版本名称 |
| `engineKey` | `String` | 是 | - | game-engine 中的规则实现键 |
| `engineVersion` | `String?` | 否 | `null` | 引擎版本号 |
| `schemaVersion` | `Int` | 是 | `1` | 规则配置 schema 版本 |
| `config` | `Json` | 是 | `{}` | 规则参数 |
| `configHash` | `String` | 是 | - | 配置哈希 |
| `validationStatus` | `ValidationStatus` | 是 | `UNVALIDATED` | 验证状态 |
| `validationReport` | `Json` | 是 | `{}` | 验证报告 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 配置状态 |
| `activatedAt` | `DateTime?` | 否 | `null` | 生效时间 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([gameId, version])
@@unique([gameId, configHash])
@@index([gameId, status])
@@index([validationStatus])
```

---

## 7.3 GameDifficulty

### 设计要求

```txt
1. 难度配置版本化。
2. difficulty.key 可以重复，但同一个 gameId + key + version 唯一。
3. 后台修改难度参数时创建新版本。
4. GameAttempt 绑定具体 difficultyId，而不是只保存 difficultyKey。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 难度配置 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `key` | `String` | 是 | - | 难度键，如 `easy`、`normal` |
| `label` | `String` | 是 | - | 展示名称 |
| `version` | `Int` | 是 | `1` | 难度版本 |
| `sortOrder` | `Int` | 是 | `0` | 展示排序 |
| `maxDurationMs` | `Int?` | 否 | `null` | 最大挑战时间 |
| `config` | `Json` | 是 | `{}` | 游戏专属难度参数 |
| `configHash` | `String` | 是 | - | 配置哈希 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 状态 |
| `activatedAt` | `DateTime?` | 否 | `null` | 生效时间 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([gameId, key, version])
@@unique([gameId, key, configHash])
@@index([gameId, key, status])
@@index([gameId, status, sortOrder])
```

### 示例配置

```json
{
  "boardSize": 4,
  "maxShuffleSteps": 80,
  "maxDurationMs": 180000,
  "scoreFormula": "duration_ms_asc_then_moves_asc"
}
```

---

## 7.4 GameContentPolicy

### 设计要求

```txt
1. 统一描述游戏题库来源。
2. 支持随机生成题库、人工题库、周期题库、混合题库。
3. 挑战开始时根据该策略生成或选择题目。
4. GameAttempt 必须记录 contentPolicyId 和当时的策略快照。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 内容策略 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `difficultyId` | `String?` | 否 | `null` | 关联难度；为空表示全难度通用 |
| `mode` | `ChallengeMode?` | 否 | `null` | 关联挑战模式；为空表示所有模式通用 |
| `contentMode` | `ContentMode` | 是 | - | 内容来源模式 |
| `selectionStrategy` | `PuzzleSelectionStrategy` | 是 | `RANDOM` | 题目选择策略 |
| `generatorKey` | `String?` | 否 | `null` | 随机生成器键 |
| `generatorConfig` | `Json` | 是 | `{}` | 随机生成参数 |
| `puzzlePoolFilter` | `Json` | 是 | `{}` | 人工题库筛选条件 |
| `scheduleGranularity` | `ScheduleGranularity?` | 否 | `null` | 周期粒度 |
| `allowRepeatedPuzzle` | `Boolean` | 是 | `true` | 是否允许同一用户重复抽到同题 |
| `repeatCooldownHours` | `Int?` | 否 | `null` | 重复冷却时间 |
| `weightConfig` | `Json` | 是 | `{}` | 加权随机配置 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 状态 |
| `activatedAt` | `DateTime?` | 否 | `null` | 生效时间 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@index([gameId, difficultyId, mode, status])
@@index([contentMode])
@@index([scheduleGranularity])
```

### 不同题库模式实现

#### 随机生成题库

```txt
contentMode = GENERATED
selectionStrategy = RANDOM
generatorKey = sliding_puzzle_generator
generatorConfig = 后台配置的生成参数
puzzleId = null
puzzleVersionId = null
GameAttempt.seed 必填
GameAttempt.generatedContentHash 必填
```

#### 人工题库

```txt
contentMode = CURATED
selectionStrategy = RANDOM / MANUAL / WEIGHTED_RANDOM
puzzlePoolFilter 用于筛选 Puzzle.status = PUBLISHED 的题目
GameAttempt.puzzleId 必填
GameAttempt.puzzleVersionId 必填
```

#### 周期题库

```txt
contentMode = SCHEDULED
selectionStrategy = DAILY / WEEKLY / MONTHLY
PuzzleSchedule 决定当前时间命中的题目版本
GameAttempt.puzzleId 必填
GameAttempt.puzzleVersionId 必填
```

#### 混合题库

```txt
contentMode = MIXED
先按 policy 配置判断走 GENERATED 或 CURATED
选择结果必须写入 GameAttempt.contentResolvedType
```

---

## 7.5 GameChallengePolicy

### 设计要求

```txt
1. 控制挑战运行时行为。
2. 控制是否允许刷新恢复、是否允许多标签页、是否记录操作。
3. 控制心跳、超时、操作日志、快照、排行榜资格。
4. 挑战开始时必须把关键策略写入 GameAttempt.policySnapshot。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 策略 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `mode` | `ChallengeMode` | 是 | `RANKED` | 挑战模式 |
| `difficultyId` | `String?` | 否 | `null` | 难度；为空表示通用 |
| `allowResume` | `Boolean` | 是 | `false` | 是否允许刷新恢复 |
| `allowMultipleActive` | `Boolean` | 是 | `false` | 是否允许同用户多局并行 |
| `requiresHeartbeat` | `Boolean` | 是 | `true` | 是否需要心跳 |
| `heartbeatIntervalSec` | `Int` | 是 | `5` | 心跳间隔 |
| `heartbeatTimeoutSec` | `Int` | 是 | `15` | 心跳超时阈值 |
| `operationLogMode` | `OperationLogMode` | 是 | `BATCHED` | 操作日志模式 |
| `operationBatchSize` | `Int` | 是 | `20` | 批量记录事件数量 |
| `snapshotEveryNEvents` | `Int?` | 否 | `null` | 每 N 个事件生成 checkpoint |
| `saveInitialSnapshot` | `Boolean` | 是 | `true` | 是否保存初始快照 |
| `saveFinalSnapshot` | `Boolean` | 是 | `true` | 是否保存最终快照 |
| `eligibleForLeaderboard` | `Boolean` | 是 | `true` | 是否允许进入排行榜 |
| `maxSubmitRetry` | `Int` | 是 | `1` | 提交重试次数 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 状态 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@index([gameId, mode, status])
@@index([gameId, difficultyId, mode, status])
```

### 默认策略

| 模式 | `allowResume` | `allowMultipleActive` | `requiresHeartbeat` | `operationLogMode` | `eligibleForLeaderboard` |
|---|---:|---:|---:|---|---:|
| `RANKED` | false | false | true | `BATCHED` | true |
| `DAILY` | false | false | true | `BATCHED` | true |
| `CASUAL` | false | true | true | `SUMMARY` | false |
| `PRACTICE` | true | true | false | `NONE` | false |
| `ADMIN_TEST` | true | true | false | `FULL` | false |

---

# 8. Puzzle System 表设计

## 8.1 Puzzle

### 设计要求

```txt
1. Puzzle 保存题目元信息，不保存具体题目内容。
2. 具体题目内容必须保存到 PuzzleVersion。
3. Puzzle 可用于人工题库、周期题库、题目级排行榜。
4. 随机生成型游戏可以不创建 Puzzle。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 题目 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `slug` | `String` | 是 | - | 题目路由标识 |
| `title` | `String` | 是 | - | 题目标题 |
| `description` | `String?` | 否 | `null` | 题目说明 |
| `difficultyId` | `String?` | 否 | `null` | 默认难度 |
| `status` | `PuzzleStatus` | 是 | `DRAFT` | 题目状态 |
| `currentVersionId` | `String?` | 否 | `null` | 当前发布版本 |
| `source` | `String?` | 否 | `null` | 题目来源 |
| `estimatedDurationSec` | `Int?` | 否 | `null` | 预计时长 |
| `sortOrder` | `Int` | 是 | `0` | 展示排序 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `publishedAt` | `DateTime?` | 否 | `null` | 发布时间 |
| `archivedAt` | `DateTime?` | 否 | `null` | 归档时间 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([gameId, slug])
@@index([gameId, status, difficultyId])
@@index([gameId, sortOrder])
@@index([currentVersionId])
```

---

## 8.2 PuzzleVersion

### 设计要求

```txt
1. 题目内容版本不可变。
2. 修改题目时创建新 PuzzleVersion。
3. 挑战开始时绑定具体 puzzleVersionId。
4. 游戏专属题目结构统一保存到 content JSON。
5. 关键查询字段不放 content，必要时冗余到 Puzzle 或 metadata。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 题目版本 ID |
| `puzzleId` | `String` | 是 | - | 题目 ID |
| `version` | `Int` | 是 | - | 版本号 |
| `schemaVersion` | `Int` | 是 | `1` | content schema 版本 |
| `engineKey` | `String` | 是 | - | game-engine 验证器键 |
| `engineVersion` | `String?` | 否 | `null` | 引擎版本 |
| `content` | `Json` | 是 | - | 游戏专属题目内容 |
| `contentHash` | `String` | 是 | - | 内容哈希 |
| `referenceSolution` | `Json?` | 否 | `null` | 参考答案或解法 |
| `validationStatus` | `ValidationStatus` | 是 | `UNVALIDATED` | 验证状态 |
| `validationReport` | `Json` | 是 | `{}` | 验证报告 |
| `status` | `PuzzleVersionStatus` | 是 | `DRAFT` | 版本状态 |
| `publishedAt` | `DateTime?` | 否 | `null` | 发布时间 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([puzzleId, version])
@@unique([puzzleId, contentHash])
@@index([puzzleId, status])
@@index([validationStatus])
@@index([publishedAt])
```

### content 示例：生命游戏

```json
{
  "width": 120,
  "height": 15,
  "boundary": { "type": "WALL" },
  "initialState": { "aliveCells": [{ "x": 1, "y": 2 }] },
  "stableState": { "aliveCells": [] },
  "targetRegions": [1, 2, 3],
  "targetAnswers": {
    "1": [{ "x": 1, "y": 1 }]
  },
  "stableGeneration": 180
}
```

### content 示例：精准造字

```json
{
  "boardSize": 6,
  "radicalPool": ["mu", "shui", "kou"],
  "cells": [],
  "solutionRounds": [],
  "config": {
    "picksPerRound": 2
  }
}
```

### content 示例：绝对指令

```json
{
  "size": { "width": 5, "height": 5, "depth": 3 },
  "startCoord": { "x": 0, "y": 0, "z": 0 },
  "cells": [],
  "rules": {
    "slideUntilBlocked": true
  }
}
```

---

## 8.3 PuzzleSchedule

### 设计要求

```txt
1. 支持每日、每周、每月、赛季和自定义周期题库。
2. 同一游戏、同一难度、同一模式下，同一时间只能命中一个 active schedule。
3. schedule 绑定 PuzzleVersion，而不是只绑定 Puzzle。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 排期 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `puzzleId` | `String` | 是 | - | 题目 ID |
| `puzzleVersionId` | `String` | 是 | - | 题目版本 ID |
| `difficultyId` | `String?` | 否 | `null` | 难度 |
| `mode` | `ChallengeMode` | 是 | `DAILY` | 挑战模式 |
| `granularity` | `ScheduleGranularity` | 是 | - | 周期粒度 |
| `startAt` | `DateTime` | 是 | - | 生效开始时间 |
| `endAt` | `DateTime` | 是 | - | 生效结束时间 |
| `timezone` | `String` | 是 | `Asia/Shanghai` | 周期时区 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 状态 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@index([gameId, difficultyId, mode, status, startAt, endAt])
@@index([puzzleVersionId])
@@index([granularity, startAt])
```

### 使用规则

```txt
挑战开始时：
  1. 根据 gameId + difficultyId + mode 查 active GameContentPolicy。
  2. 如果 contentMode = SCHEDULED，则查询当前时间命中的 PuzzleSchedule。
  3. 命中后将 puzzleId 和 puzzleVersionId 写入 GameAttempt。
  4. 未命中时拒绝开始挑战，返回 no-active-puzzle。
```

---

## 8.4 PuzzleTag

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 标签 ID |
| `gameId` | `String?` | 否 | `null` | 游戏 ID；为空表示全局标签 |
| `key` | `String` | 是 | - | 标签键 |
| `name` | `String` | 是 | - | 标签名 |
| `description` | `String?` | 否 | `null` | 标签说明 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([gameId, key])
@@index([gameId])
```

---

## 8.5 PuzzleTagBinding

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `puzzleId` | `String` | 是 | - | 题目 ID |
| `tagId` | `String` | 是 | - | 标签 ID |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@id([puzzleId, tagId])
@@index([tagId])
```

---

## 8.6 PuzzleAsset

### 设计要求

```txt
1. 题目相关图片、音频、视频、说明文件统一保存元数据。
2. 文件本体不存 PostgreSQL，只存 object storage key 或 URL。
3. PuzzleVersion.content 中引用 asset key，不直接保存大文件。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 资源 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `puzzleId` | `String?` | 否 | `null` | 题目 ID |
| `puzzleVersionId` | `String?` | 否 | `null` | 题目版本 ID |
| `assetKey` | `String` | 是 | - | 对象存储 key |
| `url` | `String?` | 否 | `null` | 访问 URL |
| `mimeType` | `String` | 是 | - | MIME 类型 |
| `sizeBytes` | `BigInt` | 是 | - | 文件大小 |
| `sha256` | `String` | 是 | - | 文件哈希 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdByUserId` | `String?` | 否 | `null` | 上传人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([sha256])
@@index([gameId])
@@index([puzzleId])
@@index([puzzleVersionId])
```

---

# 9. Challenge Runtime 表设计

## 9.1 GameAttempt

### 设计要求

```txt
1. GameAttempt 是所有游戏共用的挑战主表。
2. GameAttempt 不保存游戏专属大字段。
3. GameAttempt 只保存挑战归属、生命周期、题目绑定、配置版本、成绩摘要。
4. 所有游戏操作记录、快照、提交、验证报告都拆到独立表。
5. 挑战开始后必须锁定 ruleSetVersionId、difficultyId、contentPolicyId、challengePolicyId。
6. 随机生成题库用 seed + generatedContentHash 还原。
7. 人工题库和周期题库用 puzzleVersionId 还原。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 挑战 ID |
| `userId` | `String` | 是 | - | 用户 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `mode` | `ChallengeMode` | 是 | `RANKED` | 挑战模式 |
| `status` | `AttemptStatus` | 是 | `CREATED` | 挑战状态 |
| `scoreEligibility` | `ScoreEligibility` | 是 | `NOT_ELIGIBLE` | 成绩资格 |
| `ruleSetVersionId` | `String` | 是 | - | 规则版本 ID |
| `difficultyId` | `String?` | 否 | `null` | 难度配置 ID |
| `contentPolicyId` | `String?` | 否 | `null` | 题库策略 ID |
| `challengePolicyId` | `String?` | 否 | `null` | 挑战策略 ID |
| `contentResolvedType` | `ContentMode` | 是 | - | 实际题目来源 |
| `puzzleId` | `String?` | 否 | `null` | 题目 ID，生成型题库可为空 |
| `puzzleVersionId` | `String?` | 否 | `null` | 题目版本 ID，生成型题库可为空 |
| `seed` | `String?` | 否 | `null` | 随机种子 |
| `generatedContentHash` | `String?` | 否 | `null` | 生成内容哈希 |
| `policySnapshot` | `Json` | 是 | `{}` | 挑战开始时的策略快照 |
| `startedAt` | `DateTime?` | 否 | `null` | 开始时间 |
| `claimedAt` | `DateTime?` | 否 | `null` | play 页面 claim 时间 |
| `playingAt` | `DateTime?` | 否 | `null` | 进入 PLAYING 时间 |
| `submittedAt` | `DateTime?` | 否 | `null` | 提交时间 |
| `completedAt` | `DateTime?` | 否 | `null` | 完成时间 |
| `abandonedAt` | `DateTime?` | 否 | `null` | 放弃时间 |
| `timeoutAt` | `DateTime?` | 否 | `null` | 超时时间 |
| `interruptedAt` | `DateTime?` | 否 | `null` | 中断时间 |
| `invalidatedAt` | `DateTime?` | 否 | `null` | 作废时间 |
| `expiresAt` | `DateTime?` | 否 | `null` | 挑战过期时间 |
| `durationMs` | `Int?` | 否 | `null` | 服务端计算用时 |
| `scoreValue` | `Decimal?` | 否 | `null` | 主成绩值 |
| `metricsSummary` | `Json` | 是 | `{}` | 成绩摘要 |
| `invalidReason` | `String?` | 否 | `null` | 作废原因 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@index([userId, gameId, mode, status])
@@index([gameId, difficultyId, status, completedAt])
@@index([puzzleVersionId])
@@index([ruleSetVersionId])
@@index([status, expiresAt])
@@index([userId, createdAt])
@@index([gameId, createdAt])
```

### 状态流转规则

```txt
CREATED
  → CLAIMED
  → PLAYING
  → SUBMITTING
  → COMPLETED

PLAYING
  → ABANDONED
  → TIMEOUT
  → INTERRUPTED
  → INVALIDATED

SUBMITTING
  → COMPLETED
  → INVALIDATED

终态：
  COMPLETED
  ABANDONED
  TIMEOUT
  INTERRUPTED
  INVALIDATED
```

---

## 9.2 AttemptRuntimeSession

### 设计要求

```txt
1. attemptId 公开在 URL 中，不能作为进入游戏的唯一凭证。
2. entryToken 明文只返回给前端内存，数据库只保存 hash。
3. playSessionId 用于 claim、heartbeat、submit、abandon 校验。
4. 正式挑战刷新后丢失前端内存 token，不能恢复 play。
5. 一个 RANKED attempt 只能有一个 ACTIVE runtime session。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 运行会话 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `userId` | `String` | 是 | - | 用户 ID |
| `entryTokenHash` | `String` | 是 | - | entryToken 哈希 |
| `playSessionId` | `String` | 是 | - | play 会话 ID |
| `status` | `AttemptStatus` | 是 | `CREATED` | 当前运行状态 |
| `claimedAt` | `DateTime?` | 否 | `null` | claim 时间 |
| `lastHeartbeatAt` | `DateTime?` | 否 | `null` | 最后心跳 |
| `expiresAt` | `DateTime` | 是 | - | 会话过期时间 |
| `revokedAt` | `DateTime?` | 否 | `null` | 撤销时间 |
| `revokedReason` | `String?` | 否 | `null` | 撤销原因 |
| `userAgent` | `String?` | 否 | `null` | User-Agent |
| `ipAddress` | `String?` | 否 | `null` | IP 地址 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([entryTokenHash])
@@unique([playSessionId])
@@index([attemptId, status])
@@index([userId, status])
@@index([status, expiresAt])
@@index([status, lastHeartbeatAt])
```

---

## 9.3 AttemptOperationLog

### 设计要求

```txt
1. 用统一表保存不同游戏的操作记录。
2. 操作内容使用 payload JSON 保存，不为每个游戏新增操作表。
3. 通过 GameChallengePolicy.operationLogMode 控制是否记录、逐事件记录或批量记录。
4. 高频游戏必须使用 BATCHED 模式。
5. 操作日志按月分区。
6. 超过保留期后压缩归档或清理。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 操作日志 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `userId` | `String` | 是 | - | 用户 ID，冗余用于分区和查询 |
| `gameId` | `String` | 是 | - | 游戏 ID，冗余用于查询 |
| `playSessionId` | `String?` | 否 | `null` | play 会话 ID |
| `seqStart` | `Int` | 是 | - | 起始操作序号 |
| `seqEnd` | `Int` | 是 | - | 结束操作序号 |
| `eventCount` | `Int` | 是 | `1` | 批内事件数 |
| `logMode` | `OperationLogMode` | 是 | - | 记录模式 |
| `eventType` | `String` | 是 | - | 事件类型，如 `move`、`command`、`select` |
| `payload` | `Json` | 是 | - | 操作内容或批量操作内容 |
| `payloadHash` | `String?` | 否 | `null` | payload 哈希 |
| `clientCreatedAt` | `DateTime?` | 否 | `null` | 客户端事件时间 |
| `serverReceivedAt` | `DateTime` | 是 | `now()` | 服务端接收时间 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([attemptId, seqStart, seqEnd])
@@index([attemptId, seqStart])
@@index([userId, createdAt])
@@index([gameId, createdAt])
@@index([createdAt])
```

### 分区策略

```txt
按 createdAt 月分区：
  AttemptOperationLog_2026_05
  AttemptOperationLog_2026_06
  AttemptOperationLog_2026_07
```

### payload 示例：华容道

```json
{
  "events": [
    { "seq": 1, "type": "move", "tile": 12, "direction": "left", "clientElapsedMs": 1200 }
  ]
}
```

### payload 示例：绝对指令

```json
{
  "events": [
    {
      "seq": 1,
      "type": "command",
      "direction": "X_POS",
      "from": { "x": 0, "y": 0, "z": 0 },
      "to": { "x": 3, "y": 0, "z": 0 },
      "stopReason": "WALL"
    }
  ]
}
```

---

## 9.4 AttemptSnapshot

### 设计要求

```txt
1. 保存初始状态、最终状态、关键 checkpoint、错误状态和验证状态。
2. 不每一步保存完整快照。
3. 是否保存 checkpoint 由 GameChallengePolicy.snapshotEveryNEvents 控制。
4. 大型快照可压缩后保存到对象存储，数据库只保留引用。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 快照 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `seq` | `Int` | 是 | - | 对应操作序号；初始为 0 |
| `snapshotType` | `SnapshotType` | 是 | - | 快照类型 |
| `state` | `Json?` | 否 | `null` | 状态 JSON |
| `stateHash` | `String` | 是 | - | 状态哈希 |
| `storageKey` | `String?` | 否 | `null` | 对象存储 key，大快照使用 |
| `compressed` | `Boolean` | 是 | `false` | 是否压缩 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([attemptId, seq, snapshotType])
@@index([attemptId, seq])
@@index([snapshotType, createdAt])
@@index([createdAt])
```

---

## 9.5 GameSubmission

### 设计要求

```txt
1. 保存所有玩家提交动作。
2. 支持最终提交、区域提交、回合提交、命令提交、步骤提交。
3. 每次提交必须携带 playSessionId。
4. 服务端验证结果写入 validationResult。
5. 支持幂等提交。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 提交 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `userId` | `String` | 是 | - | 用户 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `playSessionId` | `String` | 是 | - | play 会话 ID |
| `submissionType` | `SubmissionType` | 是 | - | 提交类型 |
| `idempotencyKey` | `String` | 是 | - | 幂等键 |
| `roundIndex` | `Int?` | 否 | `null` | 回合索引 |
| `regionId` | `String?` | 否 | `null` | 区域 ID |
| `seq` | `Int?` | 否 | `null` | 操作序号 |
| `payload` | `Json` | 是 | - | 提交内容 |
| `payloadHash` | `String` | 是 | - | payload 哈希 |
| `validationPassed` | `Boolean?` | 否 | `null` | 是否验证通过 |
| `validationResult` | `Json` | 是 | `{}` | 验证结果 |
| `errorReason` | `String?` | 否 | `null` | 错误原因 |
| `submittedAt` | `DateTime` | 是 | `now()` | 提交时间 |

### 约束与索引

```prisma
@@unique([attemptId, idempotencyKey])
@@index([attemptId, submissionType])
@@index([attemptId, roundIndex])
@@index([attemptId, regionId])
@@index([userId, submittedAt])
@@index([gameId, submittedAt])
```

### 使用示例

```txt
生命游戏区域提交：
  submissionType = REGION
  regionId = "3"
  payload = { aliveCells: [...] }

精准造字回合提交：
  submissionType = ROUND
  roundIndex = 2
  payload = { selectedRadicalKeys: [...], selectedCellIndices: [...] }

绝对指令命令提交：
  submissionType = COMMAND
  seq = 12
  payload = { direction: "X_POS" }
```

---

## 9.6 AttemptValidationReport

### 设计要求

```txt
1. 保存服务端最终验证报告。
2. 防作弊校验、replay 结果、异常原因统一记录。
3. 一个 attempt 可以有多个验证报告，但最终报告只能有一个 active。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 验证报告 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `validatorKey` | `String` | 是 | - | 验证器键 |
| `validatorVersion` | `String?` | 否 | `null` | 验证器版本 |
| `passed` | `Boolean` | 是 | - | 是否通过 |
| `scoreAccepted` | `Boolean` | 是 | `false` | 成绩是否接受 |
| `antiCheatFlags` | `Json` | 是 | `[]` | 防作弊标记 |
| `metrics` | `Json` | 是 | `{}` | 验证后的指标 |
| `report` | `Json` | 是 | `{}` | 详细报告 |
| `errorReason` | `String?` | 否 | `null` | 错误原因 |
| `isFinal` | `Boolean` | 是 | `true` | 是否最终报告 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@index([attemptId, isFinal])
@@index([gameId, createdAt])
@@index([passed, createdAt])
```

---

## 9.7 ChallengeAuditLog

### 设计要求

```txt
1. 保存挑战生命周期状态变更。
2. 与 AdminAuditLog 区分，ChallengeAuditLog 记录系统自动状态变更和挑战流程事件。
3. 用于排查刷新、心跳中断、多标签页冲突、重复提交。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 审计日志 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `userId` | `String?` | 否 | `null` | 用户 ID |
| `gameId` | `String?` | 否 | `null` | 游戏 ID |
| `action` | `String` | 是 | - | 事件类型，如 `CLAIM`、`HEARTBEAT_LOST` |
| `fromStatus` | `AttemptStatus?` | 否 | `null` | 变更前状态 |
| `toStatus` | `AttemptStatus?` | 否 | `null` | 变更后状态 |
| `reason` | `String?` | 否 | `null` | 原因 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `ipAddress` | `String?` | 否 | `null` | IP 地址 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@index([attemptId, createdAt])
@@index([userId, createdAt])
@@index([gameId, createdAt])
@@index([action, createdAt])
@@index([createdAt])
```

---

# 10. Leaderboard & Score 表设计

## 10.1 LeaderboardDefinition

### 设计要求

```txt
1. 一个游戏可以有多个排行榜。
2. 排行榜可以绑定游戏、难度、题目或模式。
3. 排行榜只展示后台配置的前 N 名。
4. 排行榜定义支持未来扩展日榜、周榜、月榜、赛季榜、好友榜。
5. BEST_PER_USER 和 ALL_ATTEMPTS 必须通过 ScoreRecord / LeaderboardBest 分离实现。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 排行榜 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `slug` | `String` | 是 | - | 排行榜标识 |
| `name` | `String` | 是 | - | 排行榜名称 |
| `description` | `String?` | 否 | `null` | 排行榜说明 |
| `scope` | `LeaderboardScope` | 是 | `GLOBAL` | 榜单范围 |
| `periodType` | `LeaderboardPeriodType` | 是 | `ALL_TIME` | 周期类型 |
| `mode` | `ChallengeMode?` | 否 | `null` | 挑战模式 |
| `difficultyId` | `String?` | 否 | `null` | 难度 ID |
| `puzzleId` | `String?` | 否 | `null` | 题目 ID |
| `rankMetric` | `String` | 是 | - | 主排序指标，如 `durationMs` |
| `rankDirection` | `RankDirection` | 是 | - | 排序方向 |
| `tieBreakers` | `Json` | 是 | `[]` | 平局规则 |
| `entryPolicy` | `EntryPolicy` | 是 | `BEST_PER_USER` | 记录策略 |
| `displayLimit` | `Int` | 是 | `100` | 前台展示前 N 名 |
| `adminQueryLimit` | `Int` | 是 | `1000` | 后台最多查询数量 |
| `visible` | `Boolean` | 是 | `true` | 前台是否显示 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 状态 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([gameId, slug])
@@index([gameId, status, visible])
@@index([gameId, difficultyId, mode])
@@index([puzzleId])
@@index([scope, periodType])
```

### tieBreakers 示例

```json
[
  { "metric": "moveCount", "direction": "ASC" },
  { "metric": "completedAt", "direction": "ASC" }
]
```

---

## 10.2 LeaderboardPeriod

### 设计要求

```txt
1. 全局榜使用 periodStart = null、periodEnd = null。
2. 日榜、周榜、月榜、赛季榜使用明确时间窗口。
3. 周期榜的 timezone 必须固定。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 周期 ID |
| `leaderboardId` | `String` | 是 | - | 排行榜 ID |
| `periodType` | `LeaderboardPeriodType` | 是 | - | 周期类型 |
| `periodKey` | `String` | 是 | - | 周期键，如 `2026-W23` |
| `periodStart` | `DateTime?` | 否 | `null` | 周期开始 |
| `periodEnd` | `DateTime?` | 否 | `null` | 周期结束 |
| `timezone` | `String?` | 否 | `null` | 时区 |
| `lockedAt` | `DateTime?` | 否 | `null` | 榜单锁定时间 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([leaderboardId, periodKey])
@@index([leaderboardId, periodStart, periodEnd])
@@index([periodType, periodKey])
```

---

## 10.3 ScoreRecord

### 设计要求

```txt
1. 保存每次有效成绩记录。
2. ALL_ATTEMPTS 直接读取 ScoreRecord。
3. BEST_PER_USER 从 ScoreRecord 中物化到 LeaderboardBest。
4. 一个 attempt 对同一个 leaderboard 只能生成一条 ScoreRecord。
5. 被管理员作废的成绩不删除，改为 REVOKED。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 成绩记录 ID |
| `leaderboardId` | `String` | 是 | - | 排行榜 ID |
| `periodId` | `String?` | 否 | `null` | 周期 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `userId` | `String` | 是 | - | 用户 ID |
| `gameId` | `String` | 是 | - | 游戏 ID |
| `difficultyId` | `String?` | 否 | `null` | 难度 ID |
| `puzzleId` | `String?` | 否 | `null` | 题目 ID |
| `puzzleVersionId` | `String?` | 否 | `null` | 题目版本 ID |
| `rankValue` | `Decimal` | 是 | - | 主排名值 |
| `tieValue1` | `Decimal?` | 否 | `null` | tie-breaker 1 |
| `tieValue2` | `Decimal?` | 否 | `null` | tie-breaker 2 |
| `tieValue3` | `Decimal?` | 否 | `null` | tie-breaker 3 |
| `metrics` | `Json` | 是 | `{}` | 完整指标 |
| `status` | `ScoreRecordStatus` | 是 | `ACTIVE` | 成绩状态 |
| `visible` | `Boolean` | 是 | `true` | 是否展示 |
| `submittedAt` | `DateTime` | 是 | - | 提交时间 |
| `recordedAt` | `DateTime` | 是 | `now()` | 入榜时间 |
| `revokedAt` | `DateTime?` | 否 | `null` | 作废时间 |
| `revokedByUserId` | `String?` | 否 | `null` | 作废人 |
| `revokedReason` | `String?` | 否 | `null` | 作废原因 |

### 约束与索引

```prisma
@@unique([leaderboardId, attemptId])
@@index([leaderboardId, periodId, status, rankValue, tieValue1, tieValue2, tieValue3])
@@index([userId, leaderboardId, recordedAt])
@@index([gameId, difficultyId, recordedAt])
@@index([puzzleId, recordedAt])
@@index([status, recordedAt])
```

---

## 10.4 LeaderboardBest

### 设计要求

```txt
1. 保存每用户在每个排行榜周期内的最佳成绩。
2. BEST_PER_USER 榜只查询该表。
3. 每次新增 ScoreRecord 后，根据排行榜规则决定是否更新 LeaderboardBest。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 最佳成绩 ID |
| `leaderboardId` | `String` | 是 | - | 排行榜 ID |
| `periodId` | `String?` | 否 | `null` | 周期 ID |
| `userId` | `String` | 是 | - | 用户 ID |
| `scoreRecordId` | `String` | 是 | - | 对应成绩记录 |
| `attemptId` | `String` | 是 | - | 对应挑战 ID |
| `rankValue` | `Decimal` | 是 | - | 主排名值 |
| `tieValue1` | `Decimal?` | 否 | `null` | tie-breaker 1 |
| `tieValue2` | `Decimal?` | 否 | `null` | tie-breaker 2 |
| `tieValue3` | `Decimal?` | 否 | `null` | tie-breaker 3 |
| `metrics` | `Json` | 是 | `{}` | 指标快照 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([leaderboardId, periodId, userId])
@@index([leaderboardId, periodId, rankValue, tieValue1, tieValue2, tieValue3])
@@index([userId, leaderboardId])
```

---

## 10.5 LeaderboardRankCache

### 设计要求

```txt
1. 前台排行榜只展示前 N 名。
2. LeaderboardRankCache 保存可展示排名缓存。
3. displayLimit 变更后重新生成缓存。
4. 成绩作废后重新生成缓存。
5. 该表可由同步事务更新，也可由异步任务刷新。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 缓存 ID |
| `leaderboardId` | `String` | 是 | - | 排行榜 ID |
| `periodId` | `String?` | 否 | `null` | 周期 ID |
| `rankPosition` | `Int` | 是 | - | 排名，从 1 开始 |
| `userId` | `String` | 是 | - | 用户 ID |
| `scoreRecordId` | `String` | 是 | - | 成绩记录 ID |
| `attemptId` | `String` | 是 | - | 挑战 ID |
| `displayNameSnapshot` | `String` | 是 | - | 展示名称快照 |
| `avatarUrlSnapshot` | `String?` | 否 | `null` | 头像快照 |
| `rankValue` | `Decimal` | 是 | - | 主排名值 |
| `metrics` | `Json` | 是 | `{}` | 展示指标 |
| `generatedAt` | `DateTime` | 是 | `now()` | 缓存生成时间 |

### 约束与索引

```prisma
@@unique([leaderboardId, periodId, rankPosition])
@@unique([leaderboardId, periodId, userId])
@@index([leaderboardId, periodId])
@@index([generatedAt])
```

---

# 11. Admin & Audit 表设计

## 11.1 AdminAuditLog

### 设计要求

```txt
1. 所有后台写操作必须写审计日志。
2. 审计日志不可更新、不可物理删除，只能归档。
3. before / after 需要脱敏敏感字段。
4. 删除、发布、回滚、权限变更必须记录 actor。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 审计 ID |
| `actorUserId` | `String?` | 否 | `null` | 操作者 ID |
| `actorUsername` | `String?` | 否 | `null` | 操作者用户名快照 |
| `action` | `String` | 是 | - | 操作类型 |
| `resourceType` | `String` | 是 | - | 资源类型 |
| `resourceId` | `String?` | 否 | `null` | 资源 ID |
| `before` | `Json?` | 否 | `null` | 操作前数据，已脱敏 |
| `after` | `Json?` | 否 | `null` | 操作后数据，已脱敏 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `ipAddress` | `String?` | 否 | `null` | IP 地址 |
| `userAgent` | `String?` | 否 | `null` | User-Agent |
| `createdAt` | `DateTime` | 是 | `now()` | 操作时间 |

### 约束与索引

```prisma
@@index([actorUserId, createdAt])
@@index([resourceType, resourceId, createdAt])
@@index([action, createdAt])
@@index([createdAt])
```

### 脱敏规则

```txt
passwordHash：禁止写入 before / after
refreshTokenHash：禁止写入 before / after
entryTokenHash：禁止写入 before / after
email：保留，可按后台权限决定是否展示
ipAddress：保留，但导出时可脱敏
```

---

## 11.2 AdminReviewTask

### 设计要求

```txt
1. 用于题目发布、规则发布、成绩作废等需要审核的后台流程。
2. 小规模阶段可以不强制所有操作审核。
3. 题目和规则发布建议走审核任务。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 审核任务 ID |
| `resourceType` | `String` | 是 | - | 资源类型 |
| `resourceId` | `String` | 是 | - | 资源 ID |
| `action` | `String` | 是 | - | 待审核动作 |
| `status` | `ConfigStatus` | 是 | `DRAFT` | 审核状态 |
| `requestPayload` | `Json` | 是 | `{}` | 申请内容 |
| `reviewComment` | `String?` | 否 | `null` | 审核意见 |
| `requestedByUserId` | `String` | 是 | - | 申请人 |
| `reviewedByUserId` | `String?` | 否 | `null` | 审核人 |
| `reviewedAt` | `DateTime?` | 否 | `null` | 审核时间 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@index([resourceType, resourceId])
@@index([status, createdAt])
@@index([requestedByUserId, createdAt])
@@index([reviewedByUserId, reviewedAt])
```

---

# 12. Data Lifecycle 表设计

## 12.1 DataRetentionPolicy

### 设计要求

```txt
1. 所有大体量表必须有保留策略。
2. 清理策略可后台配置。
3. 策略按 tableName + dataClass + mode 生效。
4. 清理动作分为保留、压缩、归档、删除、匿名化。
```

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 策略 ID |
| `tableName` | `String` | 是 | - | 表名 |
| `dataClass` | `String` | 是 | - | 数据类别，如 `attempt_operation_log` |
| `gameId` | `String?` | 否 | `null` | 游戏 ID；为空表示全局 |
| `mode` | `ChallengeMode?` | 否 | `null` | 挑战模式；为空表示全部 |
| `onlineRetentionDays` | `Int` | 是 | - | 在线保留天数 |
| `archiveAfterDays` | `Int?` | 否 | `null` | 归档触发天数 |
| `deleteAfterDays` | `Int?` | 否 | `null` | 删除触发天数 |
| `action` | `RetentionAction` | 是 | - | 到期动作 |
| `archiveFormat` | `ArchiveFormat?` | 否 | `null` | 归档格式 |
| `enabled` | `Boolean` | 是 | `true` | 是否启用 |
| `createdByUserId` | `String?` | 否 | `null` | 创建人 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([tableName, dataClass, gameId, mode])
@@index([enabled, tableName])
@@index([gameId, mode])
```

---

## 12.2 DataArchiveBatch

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 归档批次 ID |
| `policyId` | `String` | 是 | - | 保留策略 ID |
| `tableName` | `String` | 是 | - | 表名 |
| `partitionKey` | `String?` | 否 | `null` | 分区键，如 `2026-05` |
| `rangeStart` | `DateTime` | 是 | - | 归档范围开始 |
| `rangeEnd` | `DateTime` | 是 | - | 归档范围结束 |
| `rowCount` | `Int` | 是 | `0` | 归档行数 |
| `totalBytes` | `BigInt` | 是 | `0` | 归档数据大小 |
| `status` | `CleanupRunStatus` | 是 | `PENDING` | 状态 |
| `startedAt` | `DateTime?` | 否 | `null` | 开始时间 |
| `completedAt` | `DateTime?` | 否 | `null` | 完成时间 |
| `errorMessage` | `String?` | 否 | `null` | 错误信息 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@index([policyId, createdAt])
@@index([tableName, rangeStart, rangeEnd])
@@index([status, createdAt])
```

---

## 12.3 DataArchiveObject

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 归档对象 ID |
| `archiveBatchId` | `String` | 是 | - | 归档批次 ID |
| `storageKey` | `String` | 是 | - | 对象存储 key |
| `format` | `ArchiveFormat` | 是 | - | 文件格式 |
| `rowCount` | `Int` | 是 | `0` | 行数 |
| `sizeBytes` | `BigInt` | 是 | `0` | 文件大小 |
| `sha256` | `String` | 是 | - | 文件哈希 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@unique([storageKey])
@@index([archiveBatchId])
@@index([sha256])
```

---

## 12.4 DataCleanupRun

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 清理任务 ID |
| `policyId` | `String?` | 否 | `null` | 策略 ID |
| `jobName` | `String` | 是 | - | 任务名称 |
| `tableName` | `String` | 是 | - | 表名 |
| `action` | `RetentionAction` | 是 | - | 执行动作 |
| `rangeStart` | `DateTime?` | 否 | `null` | 范围开始 |
| `rangeEnd` | `DateTime?` | 否 | `null` | 范围结束 |
| `matchedRows` | `Int` | 是 | `0` | 命中行数 |
| `processedRows` | `Int` | 是 | `0` | 处理行数 |
| `status` | `CleanupRunStatus` | 是 | `PENDING` | 状态 |
| `errorMessage` | `String?` | 否 | `null` | 错误信息 |
| `startedAt` | `DateTime?` | 否 | `null` | 开始时间 |
| `completedAt` | `DateTime?` | 否 | `null` | 完成时间 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |

### 约束与索引

```prisma
@@index([jobName, createdAt])
@@index([tableName, action])
@@index([status, createdAt])
```

---

# 13. Game Specific Dictionary 表设计

## 13.1 CharacterRadical

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 部首 ID |
| `key` | `String` | 是 | - | 部首键 |
| `glyph` | `String` | 是 | - | 字形 |
| `label` | `String` | 是 | - | 名称 |
| `category` | `String` | 是 | - | 分类 |
| `enabled` | `Boolean` | 是 | `true` | 是否启用 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([key])
@@index([category, enabled])
```

---

## 13.2 CharacterRoot

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 字根 ID |
| `key` | `String` | 是 | - | 字根键 |
| `glyph` | `String` | 是 | - | 字形 |
| `complexityLevel` | `String` | 是 | - | 复杂度等级 |
| `enabled` | `Boolean` | 是 | `true` | 是否启用 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([key])
@@index([complexityLevel, enabled])
```

---

## 13.3 CharacterCombination

### 字段设计

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `id` | `String` | 是 | `cuid()` | 组合 ID |
| `radicalId` | `String` | 是 | - | 部首 ID |
| `rootId` | `String` | 是 | - | 字根 ID |
| `resultChar` | `String` | 是 | - | 组合结果字 |
| `pinyin` | `String?` | 否 | `null` | 拼音 |
| `structure` | `String` | 是 | - | 结构类型 |
| `difficulty` | `String` | 是 | - | 难度 |
| `frequencyLevel` | `String` | 是 | - | 频率等级 |
| `enabled` | `Boolean` | 是 | `true` | 是否启用 |
| `metadata` | `Json` | 是 | `{}` | 扩展信息 |
| `createdAt` | `DateTime` | 是 | `now()` | 创建时间 |
| `updatedAt` | `DateTime` | 是 | `@updatedAt` | 更新时间 |

### 约束与索引

```prisma
@@unique([radicalId, rootId, resultChar])
@@index([radicalId, rootId])
@@index([difficulty, enabled])
@@index([resultChar])
```

---

# 14. 挑战创建流程

## 14.1 startChallenge 事务流程

```txt
1. 校验用户状态为 ACTIVE。
2. 根据 gameSlug 查询 Game，要求 status = PUBLISHED。
3. 根据 difficultyKey 查询 active GameDifficulty。
4. 查询 active GameRuleSetVersion。
5. 查询 active GameContentPolicy。
6. 查询 active GameChallengePolicy。
7. 如果 policy.allowMultipleActive = false：
     查询用户是否存在 CREATED / CLAIMED / PLAYING / SUBMITTING 的同模式挑战。
     存在则拒绝创建。
8. 根据 GameContentPolicy 解析题目来源：
     GENERATED：生成 seed，调用 game-engine 生成 initial state。
     CURATED：从 Puzzle/PuzzleVersion 中选择题目。
     SCHEDULED：从 PuzzleSchedule 中选择当前题目。
     MIXED：按策略分流。
9. 创建 GameAttempt：
     status = CREATED
     ruleSetVersionId = 当前规则版本
     difficultyId = 当前难度版本
     contentPolicyId = 当前内容策略
     challengePolicyId = 当前挑战策略
     policySnapshot = 策略快照
10. 创建 AttemptRuntimeSession：
     entryTokenHash
     playSessionId
     expiresAt
11. 如果 saveInitialSnapshot = true：
     写 AttemptSnapshot(type = INITIAL)
12. 写 ChallengeAuditLog(action = START)
13. 返回 attemptId、entryToken、playSessionId、initialState、playPath。
```

---

## 14.2 claimChallenge 流程

```txt
1. 根据 attemptId 查询 GameAttempt。
2. 校验 userId 匹配。
3. 查询 AttemptRuntimeSession。
4. 校验 entryTokenHash。
5. 校验 playSessionId。
6. 校验 status in [CREATED, CLAIMED]。
7. 校验 expiresAt 未过期。
8. 条件更新：
     GameAttempt.status = CLAIMED
     GameAttempt.claimedAt = now
     AttemptRuntimeSession.status = CLAIMED
9. 写 ChallengeAuditLog(action = CLAIM)。
10. 返回 initialState 或从 AttemptSnapshot 读取 INITIAL。
```

---

## 14.3 enterPlaying 流程

```txt
1. play 页面完成初始化后调用 enterPlaying。
2. 校验 attempt.status = CLAIMED。
3. 校验 playSessionId。
4. 更新 GameAttempt.status = PLAYING。
5. 更新 AttemptRuntimeSession.status = PLAYING。
6. 写 ChallengeAuditLog(action = ENTER_PLAY)。
7. 启动 heartbeat。
```

---

# 15. 挑战提交与排行榜写入流程

## 15.1 finishChallenge 事务流程

```txt
BEGIN

1. 条件更新 GameAttempt：
   WHERE id = attemptId
   AND userId = currentUserId
   AND status = PLAYING
   SET status = SUBMITTING, submittedAt = now

2. 如果更新行数为 0：
   查询当前状态，返回幂等结果或拒绝。

3. 校验 AttemptRuntimeSession.playSessionId。

4. 读取：
   GameRuleSetVersion
   GameDifficulty
   PuzzleVersion 或 generated seed
   GameChallengePolicy 快照
   AttemptOperationLog
   GameSubmission
   AttemptSnapshot INITIAL

5. 调用 game-engine 服务端权威验证。

6. 写 GameSubmission(type = FINAL)。

7. 写 AttemptValidationReport。

8. 写 AttemptSnapshot(type = FINAL)。

9. 如果验证失败：
   更新 GameAttempt.status = INVALIDATED
   scoreEligibility = NOT_ELIGIBLE
   invalidReason = 验证失败原因
   写 ChallengeAuditLog
   COMMIT

10. 如果验证成功：
    更新 GameAttempt.status = COMPLETED
    completedAt = now
    durationMs = 服务端计算值
    scoreValue = 主成绩值
    metricsSummary = 指标摘要
    scoreEligibility = ELIGIBLE

11. 查询匹配的 LeaderboardDefinition：
    gameId 匹配
    mode 匹配或为空
    difficultyId 匹配或为空
    puzzleId 匹配或为空
    status = ACTIVE

12. 对每个 LeaderboardDefinition：
    计算 periodId
    插入 ScoreRecord
    如果 entryPolicy = BEST_PER_USER：
      比较 rankValue + tieValue
      upsert LeaderboardBest
    刷新 LeaderboardRankCache 或写入异步刷新任务

13. 写 ChallengeAuditLog(action = COMPLETE)。

COMMIT
```

---

## 15.2 排名比较规则

```txt
rankDirection = ASC：
  rankValue 越小越好。

rankDirection = DESC：
  rankValue 越大越好。

tieBreakers：
  逐个比较 tieValue1、tieValue2、tieValue3。

所有比较必须在服务端完成。
客户端提交的 score、duration、moves 只能作为参考，不能直接入榜。
```

---

# 16. 数据清理与归档架构

## 16.1 数据分级

| 数据类别 | 表 | 保留方式 |
|---|---|---|
| 用户基础信息 | `User` | 长期保留；账号删除后匿名化 |
| 登录会话 | `AuthSession` | 过期后短期保留，然后删除 |
| 游戏和题目配置 | `Game` / `Puzzle` / `PuzzleVersion` | 长期保留，不物理删除 |
| 挑战主记录 | `GameAttempt` | 长期保留摘要，必要时匿名化 |
| 操作日志 | `AttemptOperationLog` | 短期在线，之后压缩归档或删除 |
| 快照 | `AttemptSnapshot` | 初始/最终中期保留，checkpoint 短期保留 |
| 提交记录 | `GameSubmission` | 中期保留，之后归档 |
| 验证报告 | `AttemptValidationReport` | 中期保留，异常报告长期保留 |
| 排行榜成绩 | `ScoreRecord` / `LeaderboardBest` | 长期保留，作废不删除 |
| 展示缓存 | `LeaderboardRankCache` | 可重建，短期保留 |
| 审计日志 | `AdminAuditLog` / `ChallengeAuditLog` | 长期保留，之后归档 |

---

## 16.2 默认保留周期

| 数据 | 在线保留 | 归档时间 | 删除时间 | 动作 |
|---|---:|---:|---:|---|
| `AuthSession` 过期记录 | 90 天 | 不归档 | 90 天 | `DELETE` |
| `AttemptRuntimeSession` 终态记录 | 30 天 | 不归档 | 30 天 | `DELETE` |
| `GameAttempt` 摘要 | 3 年 | 3 年 | 不默认删除 | `ARCHIVE` |
| `AttemptOperationLog` ranked | 180 天 | 180 天 | 365 天 | `ARCHIVE` 后 `DELETE` |
| `AttemptOperationLog` practice | 7 天 | 不归档 | 7 天 | `DELETE` |
| `AttemptSnapshot` INITIAL / FINAL | 180 天 | 180 天 | 365 天 | `ARCHIVE` 后 `DELETE` |
| `AttemptSnapshot` CHECKPOINT | 30 天 | 30 天 | 90 天 | `ARCHIVE` 后 `DELETE` |
| `GameSubmission` | 180 天 | 180 天 | 365 天 | `ARCHIVE` 后 `DELETE` |
| `AttemptValidationReport` passed | 365 天 | 365 天 | 2 年 | `ARCHIVE` 后 `DELETE` |
| `AttemptValidationReport` failed / anti-cheat | 2 年 | 2 年 | 5 年 | `ARCHIVE` 后 `DELETE` |
| `ScoreRecord` | 长期 | 3 年 | 不默认删除 | `KEEP` / `ARCHIVE` |
| `LeaderboardBest` | 长期 | 不归档 | 不删除 | `KEEP` |
| `LeaderboardRankCache` | 30 天 | 不归档 | 30 天 | `DELETE` |
| `ChallengeAuditLog` | 1 年 | 1 年 | 3 年 | `ARCHIVE` 后 `DELETE` |
| `AdminAuditLog` | 2 年 | 2 年 | 5 年 | `ARCHIVE` 后 `DELETE` |
| `PuzzleVersion` | 长期 | 不归档 | 不删除 | `KEEP` |

---

## 16.3 分区策略

以下表必须按月分区：

```txt
AttemptOperationLog
AttemptSnapshot
GameSubmission
ChallengeAuditLog
AdminAuditLog
ScoreRecord
```

分区命名：

```txt
attempt_operation_log_YYYY_MM
attempt_snapshot_YYYY_MM
game_submission_YYYY_MM
challenge_audit_log_YYYY_MM
admin_audit_log_YYYY_MM
score_record_YYYY_MM
```

分区维护任务：

```txt
1. 每月提前创建未来 3 个月分区。
2. 清理时优先按分区处理。
3. 整个分区超过保留期时，先归档分区数据，再 detach/drop 分区。
4. 不对主表直接执行大范围 DELETE。
```

---

## 16.4 归档格式

默认归档格式：

```txt
AttemptOperationLog：JSONL_GZIP
AttemptSnapshot：JSONL_GZIP 或对象存储原始压缩 JSON
GameSubmission：JSONL_GZIP
ScoreRecord：PARQUET
AdminAuditLog：JSONL_GZIP
ChallengeAuditLog：JSONL_GZIP
```

归档路径规范：

```txt
archives/{tableName}/year={YYYY}/month={MM}/batch={batchId}/part-{n}.jsonl.gz
archives/{tableName}/year={YYYY}/month={MM}/batch={batchId}/part-{n}.parquet
```

归档流程：

```txt
1. 根据 DataRetentionPolicy 查找到期数据。
2. 创建 DataArchiveBatch。
3. 分批读取源表数据。
4. 写入对象存储文件。
5. 计算 sha256、sizeBytes、rowCount。
6. 写 DataArchiveObject。
7. 校验归档对象行数和哈希。
8. 标记 DataArchiveBatch = COMPLETED。
9. 执行源表删除或分区 drop。
10. 写 DataCleanupRun。
```

---

## 16.5 清理任务

### ChallengeReaperJob

执行频率：

```txt
每 10 秒执行一次。
```

处理规则：

```txt
1. PLAYING 且 expiresAt < now → TIMEOUT
2. PLAYING 且 lastHeartbeatAt < now - heartbeatTimeoutSec → INTERRUPTED
3. CREATED 超过 60 秒未 claim → INTERRUPTED
4. CLAIMED 超过 60 秒未进入 PLAYING → INTERRUPTED
5. SUBMITTING 超过 60 秒未完成 → INVALIDATED 或进入后台人工检查
```

### AttemptLogCompactionJob

执行频率：

```txt
每天执行一次。
```

处理规则：

```txt
1. 对 BATCHED 操作日志进行压缩。
2. 对 FULL 模式的旧 checkpoint 做降采样。
3. 保留 INITIAL / FINAL / ERROR 快照。
4. 删除可由事件回放重建的过密 checkpoint。
```

### ArchiveJob

执行频率：

```txt
每天凌晨执行一次。
```

处理规则：

```txt
1. 按 DataRetentionPolicy 查找 archiveAfterDays 到期数据。
2. 归档到对象存储。
3. 写 DataArchiveBatch 和 DataArchiveObject。
4. 归档完成后才能删除在线数据。
```

### PurgeJob

执行频率：

```txt
每天凌晨执行一次。
```

处理规则：

```txt
1. 删除 deleteAfterDays 到期数据。
2. 优先 drop 过期分区。
3. 对非分区表按小批量删除。
4. 每批删除限制 1000~5000 行。
5. 每次执行必须写 DataCleanupRun。
```

---

## 16.6 账号删除后的数据处理

```txt
1. User.status = DELETED。
2. User.email 替换为 deleted-{userId}@deleted.local。
3. User.username 替换为 deleted-{userId}。
4. User.displayName 替换为 已注销用户。
5. AuthSession 全部 REVOKED。
6. ScoreRecord、LeaderboardBest 保留，但展示名称使用快照或已注销用户。
7. AttemptOperationLog 按保留策略正常清理。
8. AdminAuditLog 不删除，但脱敏可识别字段。
```

---

# 17. Prisma 关系实现要求

## 17.1 外键策略

```txt
1. 核心业务引用使用外键。
2. 大日志表可以保留外键或只保留冗余 ID，按性能决定。
3. User 删除不级联删除业务数据。
4. Game / Puzzle / PuzzleVersion 不物理删除。
5. ScoreRecord 不因 attempt 清理而删除；attempt 摘要应长期保留。
```

推荐：

```txt
User -> GameAttempt: Restrict / NoAction
Game -> Puzzle: Restrict / NoAction
Puzzle -> PuzzleVersion: Restrict / NoAction
GameAttempt -> ScoreRecord: Restrict / NoAction
GameAttempt -> AttemptOperationLog: Cascade 可选，但生产推荐不级联，走清理任务
```

---

## 17.2 JSON 字段使用规则

允许放 JSON 的字段：

```txt
PuzzleVersion.content
GameDifficulty.config
GameRuleSetVersion.config
GameContentPolicy.generatorConfig
GameAttempt.policySnapshot
AttemptOperationLog.payload
AttemptSnapshot.state
GameSubmission.payload
AttemptValidationReport.report
ScoreRecord.metrics
```

禁止只放 JSON 的字段：

```txt
状态
发布时间
难度
题目版本
排行榜排名值
用户 ID
游戏 ID
挑战状态
过期时间
是否入榜
是否展示
```

---

## 17.3 哈希字段规则

以下内容必须计算 hash：

```txt
GameRuleSetVersion.configHash
GameDifficulty.configHash
PuzzleVersion.contentHash
AttemptSnapshot.stateHash
AttemptOperationLog.payloadHash
GameSubmission.payloadHash
```

用途：

```txt
1. 防重复。
2. 验证归档完整性。
3. 防止内容被误改。
4. 支持服务端 replay 校验。
```

---

# 18. 旧表迁移方案

## 18.1 Game.difficultyLevels 迁移

```txt
旧：Game.difficultyLevels JSON
新：GameDifficulty 多行版本化记录

迁移规则：
1. 遍历每个 Game.difficultyLevels。
2. 为每个 difficulty key 创建 GameDifficulty。
3. version = 1。
4. status = ACTIVE。
5. 原 JSON 元素写入 config。
6. maxDurationMs 提升为独立列。
```

---

## 18.2 各游戏题目表迁移

```txt
LifePuzzle
  → Puzzle
  → PuzzleVersion.content

PreciseCharacterPuzzle
  → Puzzle
  → PuzzleVersion.content

AbsoluteCommandPuzzle
  → Puzzle

AbsoluteCommandPuzzleVersion
  → PuzzleVersion.content
```

迁移规则：

```txt
1. 每条旧题目创建一条 Puzzle。
2. 每个旧题目版本创建一条 PuzzleVersion。
3. 如果旧表没有版本概念，默认 version = 1。
4. 旧题目 status 映射到 Puzzle.status。
5. 当前可用题目设置 currentVersionId。
```

---

## 18.3 GameAttempt 迁移

```txt
旧字段 initialState
  → AttemptSnapshot(type = INITIAL, seq = 0)

旧字段 finalState
  → AttemptSnapshot(type = FINAL)

旧字段 moveTrace
  → AttemptOperationLog，按 batch 拆分

旧字段 metrics
  → GameAttempt.metricsSummary
  → ScoreRecord.metrics

旧字段 rankValue
  → GameAttempt.scoreValue
  → ScoreRecord.rankValue
```

---

## 18.4 LeaderboardEntry 迁移

```txt
旧 LeaderboardDefinition
  → 新 LeaderboardDefinition

旧 LeaderboardEntry
  → ScoreRecord
  → LeaderboardBest
  → LeaderboardRankCache
```

迁移规则：

```txt
1. 每条旧 LeaderboardEntry 创建 ScoreRecord。
2. 如果旧策略是 BEST_PER_USER，创建 LeaderboardBest。
3. 根据 displayLimit 生成 LeaderboardRankCache。
4. 旧 bestAttemptId 映射到 attemptId。
```

---

# 19. 后台管理实现要求

## 19.1 游戏管理

后台游戏管理必须支持：

```txt
1. 创建 / 编辑 Game。
2. 发布 / 归档 / 禁用 Game。
3. 管理 GameRuleSetVersion。
4. 管理 GameDifficulty。
5. 管理 GameContentPolicy。
6. 管理 GameChallengePolicy。
7. 查看策略版本使用情况。
```

---

## 19.2 题库管理

后台题库管理必须支持：

```txt
1. 创建 Puzzle。
2. 创建 PuzzleVersion。
3. 验证 PuzzleVersion。
4. 发布 PuzzleVersion。
5. 回滚 currentVersionId。
6. 配置 PuzzleSchedule。
7. 上传 PuzzleAsset。
8. 批量导入题目。
9. 禁用题目但不删除历史版本。
```

---

## 19.3 挑战管理

后台挑战管理必须支持：

```txt
1. 查询 active attempts。
2. 查询 abandoned / timeout / interrupted / invalidated attempts。
3. 查看单个 attempt 的状态流转。
4. 查看 operation logs。
5. 查看 snapshots。
6. 查看 validation report。
7. 强制作废异常 attempt。
8. 触发重新验证。
```

---

## 19.4 排行榜管理

后台排行榜管理必须支持：

```txt
1. 创建多个 LeaderboardDefinition。
2. 设置 difficulty、mode、puzzle 绑定范围。
3. 设置 rankMetric、rankDirection、tieBreakers。
4. 设置 displayLimit。
5. 手动刷新 LeaderboardRankCache。
6. 隐藏或作废 ScoreRecord。
7. 查看 ScoreRecord 来源 attempt。
8. 锁定历史周期榜。
```

---

# 20. 最终落地顺序

## Phase 1：建立核心配置表

```txt
1. 创建 GameRuleSetVersion。
2. 创建 GameDifficulty。
3. 创建 GameContentPolicy。
4. 创建 GameChallengePolicy。
5. 从旧 Game.difficultyLevels 迁移难度。
```

## Phase 2：建立通用题库系统

```txt
1. 创建 Puzzle。
2. 创建 PuzzleVersion。
3. 创建 PuzzleSchedule。
4. 迁移 LifePuzzle、PreciseCharacterPuzzle、AbsoluteCommandPuzzle。
5. 接入后台题库管理。
```

## Phase 3：重构挑战生命周期

```txt
1. 重构 GameAttempt。
2. 新增 AttemptRuntimeSession。
3. 新增 AttemptOperationLog。
4. 新增 AttemptSnapshot。
5. 新增 GameSubmission。
6. 新增 AttemptValidationReport。
7. 接入 Challenge Runtime Gateway。
```

## Phase 4：重构排行榜

```txt
1. 创建 LeaderboardPeriod。
2. 创建 ScoreRecord。
3. 创建 LeaderboardBest。
4. 创建 LeaderboardRankCache。
5. 迁移旧 LeaderboardEntry。
6. 接入 displayLimit 配置。
```

## Phase 5：接入数据清理系统

```txt
1. 创建 DataRetentionPolicy。
2. 创建 DataArchiveBatch。
3. 创建 DataArchiveObject。
4. 创建 DataCleanupRun。
5. 对大表做月分区。
6. 实现 ChallengeReaperJob。
7. 实现 ArchiveJob。
8. 实现 PurgeJob。
```

## Phase 6：接入后台权限和审计

```txt
1. 创建 Role / Permission。
2. 创建 UserRole / RolePermission。
3. 完善 AdminAuditLog。
4. 接入 AdminReviewTask。
5. 所有后台写操作接入审计。
```
