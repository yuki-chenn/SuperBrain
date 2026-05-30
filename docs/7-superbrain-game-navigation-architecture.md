# SuperBrain 游戏挑战路由与 Attempt 生命周期统一管理方案

## 1. 设计背景

SuperBrain 是一个 Web 益智游戏平台，后续会持续扩展不同类型的游戏。当前玩家端采用 React SPA、TanStack Router、TanStack Query、Zustand；服务端采用 NestJS、Prisma、PostgreSQL、Redis；游戏逻辑由 `@brain-games/game-engine` 承担服务端权威验证。

当前玩家端已经存在多条游戏入口，例如：

```txt
/games/sliding-puzzle/play
/games/life-game/play
/games/life-game/practice
/games/precise-character-building/play
/games/absolute-command/puzzles/$slug/play
```

这些游戏虽然玩法不同，但都存在相同的挑战生命周期问题：

```txt
开始挑战 → 进入游戏 → 游玩中 → 提交结果 → 服务端验证 → 生成结果 / 排行榜
```

当前需要统一处理以下非正常进入方式：

```txt
1. 浏览器 Back 后再 Forward 重新进入游戏
2. 游戏中刷新页面
3. 直接输入 /play URL
4. 多标签页同时打开同一个游戏
5. 登录状态变化后恢复旧游戏页
6. 已完成挑战后返回旧 play 页面
7. 已放弃挑战后通过浏览器历史恢复
8. 未来新增游戏后重复实现路由控制逻辑
```

本方案的核心目标不是“禁用浏览器按钮”，而是建立一个统一的 **Challenge Runtime Gateway**，使所有进入游戏挑战页的行为都必须经过同一套准入校验、状态流转、异常处理和清理逻辑。

---

## 2. 核心结论

本项目应采用以下设计原则：

```txt
1. /play 页面只展示游戏，不负责创建挑战。
2. 创建挑战只能发生在 /start 页面或统一的 ChallengeNavigationManager 中。
3. 进入 /play 必须携带 attemptId，并通过服务端 claim 校验。
4. 浏览器 Back / Forward / Refresh / 直接输入 URL 都不能绕过 attempt 状态机。
5. 前端 Zustand Store 只管理本地交互状态，不判断挑战是否合法。
6. 服务端 GameAttempt 状态是唯一权威。
7. 所有游戏通过统一 GameRuntimeAdapter 接入路由生命周期。
8. 正式挑战和练习模式使用不同恢复策略。
```

最终目标：

```txt
用户正常开始游戏：
  允许进入 play

用户返回后再前进：
  不恢复游戏，进入 expired / result 页面

用户刷新：
  正式挑战不恢复，进入 expired 页面

用户直接输入 play URL：
  不创建挑战，不恢复挑战

用户完成后返回 play：
  自动跳转 result

用户放弃后 forward：
  自动跳转 expired

新增游戏：
  只实现游戏 Adapter，不重复实现路由安全逻辑
```

---

## 3. 问题拆解

### 3.1 浏览器历史不是安全边界

浏览器历史中可能保留旧的 `/play` 页面 URL。用户可以通过：

```txt
Back
Forward
Refresh
地址栏输入
复制链接
多标签页打开
```

重新触发路由匹配。

因此，不能依赖以下方式保证规则：

```ts
window.onpopstate = () => {
  history.pushState(null, '', location.href)
}
```

这种方案的问题：

```txt
1. 污染浏览器历史
2. 破坏用户预期
3. 移动端行为不稳定
4. 无法处理刷新和直接输入 URL
5. 不能防止用户构造 API 请求
6. 多游戏扩展时会产生大量重复逻辑
```

正确方案是：

```txt
允许浏览器行为发生
  → 进入 Router 管线
  → Route Guard 校验 runtime session
  → 服务端校验 attempt 状态
  → 合法则进入游戏
  → 非法则 replace 到 expired/result 页面
```

### 3.2 游戏页面不应承担 attempt 创建职责

错误模式：

```txt
访问 /games/sliding-puzzle/play
  → 页面 mount
  → 自动 POST /attempts/start
  → 初始化游戏
```

这个模式会导致：

```txt
1. Forward 进入旧 /play 时可能重新创建 attempt
2. Refresh 后可能重新开始一局
3. 直接输入 URL 可能绕过详情页和难度选择
4. 不同游戏重复处理 start 逻辑
5. 服务端无法区分正常开始和历史恢复
```

正确模式：

```txt
游戏详情页 / start 页面
  → 用户显式点击开始
  → ChallengeNavigationManager.startChallenge()
  → POST /api/challenges/start
  → 获得 attemptId + entryToken + playSessionId
  → 写入内存 Runtime Store
  → navigate 到 /attempts/$attemptId/play
  → play route beforeLoad 执行 claim
  → 通过后初始化游戏 Store
```

---

## 4. 总体架构

### 4.1 新增统一挑战运行时层

在现有架构中新增一层：

```txt
┌─────────────────────────────────────────────────────────────┐
│                        apps/web                              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                TanStack Router                         │  │
│  │  /games/$slug/start                                    │  │
│  │  /games/$slug/attempts/$attemptId/play                 │  │
│  │  /games/$slug/attempts/$attemptId/result               │  │
│  │  /games/$slug/attempts/$attemptId/expired              │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Challenge Runtime Gateway                     │  │
│  │                                                       │  │
│  │  ChallengeNavigationManager                            │  │
│  │  ChallengeRouteGuard                                   │  │
│  │  ChallengeBlocker                                      │  │
│  │  ChallengeRuntimeStore                                 │  │
│  │  ChallengeHeartbeat                                    │  │
│  │  ChallengeBroadcast                                    │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Game Runtime Adapter Layer                │  │
│  │                                                       │  │
│  │  SlidingPuzzleRuntimeAdapter                           │  │
│  │  LifeGameRuntimeAdapter                                │  │
│  │  PreciseCharacterRuntimeAdapter                        │  │
│  │  AbsoluteCommandRuntimeAdapter                         │  │
│  │  FutureGameRuntimeAdapter                              │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Game Zustand Stores                    │  │
│  │  useSlidingPuzzleStore                                 │  │
│  │  useLifeGameStore                                      │  │
│  │  usePreciseCharacterStore                              │  │
│  │  useAbsoluteCommandStore                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        apps/api                              │
│                                                             │
│  AttemptsModule                                              │
│  ChallengeSessionService                                     │
│  ChallengeHeartbeatService                                   │
│  GameAdapter Registry                                        │
│  LeaderboardsModule                                          │
│  AdminAuditLog                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心模块职责

| 模块 | 所在端 | 职责 |
|---|---|---|
| `ChallengeNavigationManager` | 前端 | 统一开始、进入、离开、完成、跳转 |
| `ChallengeRouteGuard` | 前端 | 校验 `/play` 是否允许进入 |
| `ChallengeRuntimeStore` | 前端 | 保存当前 JS runtime 内的 attempt session |
| `ChallengeBlocker` | 前端 | 拦截 Back / Forward / 站内跳转 |
| `ChallengeHeartbeat` | 前端 | 定期上报活跃状态 |
| `ChallengeBroadcast` | 前端 | 跨标签页同步 attempt 状态 |
| `GameRuntimeAdapter` | 前端 | 屏蔽不同游戏 Store 差异 |
| `ChallengeSessionService` | 后端 | 管理 attempt claim、session、entryToken |
| `AttemptsModule` | 后端 | 管理 attempt 生命周期 |
| `GameAdapter` | 后端 | 各游戏开始和完成验证 |
| `@brain-games/game-engine` | 共享包 | 游戏纯逻辑和服务端验证 |

---

## 5. 路由设计

### 5.1 通用路由模型

所有正式挑战统一使用以下结构：

```txt
/games
/games/$gameSlug
/games/$gameSlug/start
/games/$gameSlug/attempts/$attemptId/play
/games/$gameSlug/attempts/$attemptId/result
/games/$gameSlug/attempts/$attemptId/expired
/games/$gameSlug/leaderboards
```

含义：

| 路由 | 职责 |
|---|---|
| `/games` | 游戏列表 |
| `/games/$gameSlug` | 游戏详情 |
| `/games/$gameSlug/start` | 难度选择、规则确认、创建 attempt |
| `/games/$gameSlug/attempts/$attemptId/play` | 游戏挑战页，只允许合法 attempt 进入 |
| `/games/$gameSlug/attempts/$attemptId/result` | 挑战结果页 |
| `/games/$gameSlug/attempts/$attemptId/expired` | 挑战失效页 |
| `/games/$gameSlug/leaderboards` | 排行榜 |

### 5.2 带谜题维度的游戏路由

例如“绝对指令”这类游戏有 puzzle 维度，应使用扩展路由：

```txt
/games/absolute-command
/games/absolute-command/puzzles/$puzzleSlug
/games/absolute-command/puzzles/$puzzleSlug/start
/games/absolute-command/puzzles/$puzzleSlug/attempts/$attemptId/play
/games/absolute-command/puzzles/$puzzleSlug/attempts/$attemptId/result
/games/absolute-command/puzzles/$puzzleSlug/attempts/$attemptId/expired
```

未来若新增关卡制、房间制、每日挑战制游戏，可扩展为：

```txt
/games/$gameSlug/modes/$modeKey/start
/games/$gameSlug/levels/$levelId/start
/games/$gameSlug/rooms/$roomId/start
/games/$gameSlug/daily/$date/start
```

但进入 play 的部分仍然保持一致：

```txt
.../attempts/$attemptId/play
.../attempts/$attemptId/result
.../attempts/$attemptId/expired
```

### 5.3 旧路由处理

当前已有旧路由：

```txt
/games/sliding-puzzle/play
/games/life-game/play
/games/precise-character-building/play
/games/absolute-command/puzzles/$slug/play
```

迁移后全部改为 redirect，不允许创建 attempt：

```txt
/games/sliding-puzzle/play
  → replace /games/sliding-puzzle/start

/games/life-game/play
  → replace /games/life-game/start

/games/precise-character-building/play
  → replace /games/precise-character-building/start

/games/absolute-command/puzzles/$slug/play
  → replace /games/absolute-command/puzzles/$slug/start
```

规则：

```txt
旧 /play 路由只负责重定向。
旧 /play 路由不能调用 startAttempt。
旧 /play 路由不能读取旧 Zustand 状态恢复游戏。
```

---

## 6. Attempt 生命周期状态机

### 6.1 服务端权威状态

`GameAttempt` 增加统一状态：

```ts
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
```

状态说明：

| 状态 | 含义 |
|---|---|
| `CREATED` | attempt 已创建，但 play 页面尚未 claim |
| `CLAIMED` | play route 已认领，正在准备初始化 |
| `PLAYING` | 玩家正在挑战 |
| `PAUSED` | 仅练习模式可用，正式挑战默认不用 |
| `SUBMITTING` | 正在提交结果，防止重复提交 |
| `COMPLETED` | 服务端验证完成，结果已生成 |
| `ABANDONED` | 用户主动离开 |
| `TIMEOUT` | 超过最大时长 |
| `INTERRUPTED` | 心跳中断、刷新、关闭、崩溃等 |
| `INVALIDATED` | 非法恢复、session 冲突、状态异常 |

### 6.2 状态流转图

```txt
                    ┌────────────┐
                    │  CREATED   │
                    └─────┬──────┘
                          │ claim
                          ▼
                    ┌────────────┐
                    │  CLAIMED   │
                    └─────┬──────┘
                          │ enter play
                          ▼
                    ┌────────────┐
                    │  PLAYING   │
                    └─────┬──────┘
                          │
      ┌───────────────────┼────────────────────┐
      │                   │                    │
      │ finish            │ abandon             │ timeout
      ▼                   ▼                    ▼
┌────────────┐      ┌────────────┐       ┌────────────┐
│ SUBMITTING │      │ ABANDONED  │       │  TIMEOUT   │
└─────┬──────┘      └────────────┘       └────────────┘
      │ validate
      ▼
┌────────────┐
│ COMPLETED  │
└────────────┘

PLAYING
  └─ heartbeat lost / refresh / close
      → INTERRUPTED

任意状态出现非法恢复 / session 冲突
  → INVALIDATED
```

### 6.3 合法状态迁移表

| 当前状态 | 事件 | 新状态 | 是否允许 |
|---|---|---:|---|
| `CREATED` | `claim` | `CLAIMED` | 是 |
| `CLAIMED` | `enter_play` | `PLAYING` | 是 |
| `PLAYING` | `submit` | `SUBMITTING` | 是 |
| `SUBMITTING` | `validated` | `COMPLETED` | 是 |
| `PLAYING` | `abandon` | `ABANDONED` | 是 |
| `PLAYING` | `timeout` | `TIMEOUT` | 是 |
| `PLAYING` | `heartbeat_lost` | `INTERRUPTED` | 是 |
| `COMPLETED` | `enter_play` | `COMPLETED` | 否，跳 result |
| `ABANDONED` | `enter_play` | `ABANDONED` | 否，跳 expired |
| `TIMEOUT` | `enter_play` | `TIMEOUT` | 否，跳 expired |
| `INTERRUPTED` | `enter_play` | `INTERRUPTED` | 否，跳 expired |
| 任意终态 | `finish` | 原状态 | 否，幂等拒绝 |
| 任意状态 | `session_conflict` | `INVALIDATED` | 是 |

---

## 7. Challenge Runtime Session 设计

### 7.1 为什么需要 Runtime Session

`attemptId` 不能作为进入游戏的唯一凭证。

原因：

```txt
1. attemptId 会暴露在 URL 中。
2. 用户可以复制 play URL。
3. 浏览器 forward 会重新访问旧 URL。
4. 刷新后 URL 仍然存在。
5. 多标签页可以打开同一个 URL。
```

因此需要额外的 runtime session。

### 7.2 Runtime Session 字段

前端内存中保存：

```ts
type ChallengeRuntimeSession = {
  attemptId: string
  gameSlug: string
  mode: ChallengeMode
  difficultyKey: string
  entryToken: string
  playSessionId: string
  startedAt: string
  expiresAt: string
  status: ChallengeRuntimeStatus
}
```

服务端保存：

```ts
type ChallengeSessionRecord = {
  attemptId: string
  userId: string
  gameSlug: string
  mode: ChallengeMode
  entryTokenHash: string
  playSessionId: string
  status: AttemptStatus
  createdAt: Date
  claimedAt?: Date
  startedAt?: Date
  expiresAt: Date
  lastHeartbeatAt?: Date
  abandonedAt?: Date
  completedAt?: Date
}
```

### 7.3 存储策略

| 数据 | 存储位置 | 是否持久化 | 原因 |
|---|---|---:|---|
| `attemptId` | URL | 是 | 用于结果页、失效页、服务端查询 |
| `entryToken` | JS 内存 | 否 | 防止刷新和复制 URL 恢复挑战 |
| `playSessionId` | JS 内存 | 否 | 防止多标签页和重复提交 |
| `initialState` | route loader / game store | 否 | 只能从合法 claim 返回 |
| `moveTrace` | game store | 否 | 刷新后不恢复正式挑战 |
| `result` | 服务端 | 是 | 结果页可查询 |

关键规则：

```txt
正式挑战：
  entryToken 只存在内存。
  刷新后丢失。
  丢失后不能恢复 play。

练习模式：
  可以使用 sessionStorage 恢复。
  但不能进入排行榜。
```

---

## 8. 挑战模式分类

未来多游戏扩展时，不同游戏可能有不同恢复策略，因此需要显式定义 `ChallengeMode`。

```ts
enum ChallengeMode {
  RANKED = 'ranked',
  CASUAL = 'casual',
  PRACTICE = 'practice',
  DAILY = 'daily',
  ROOM = 'room',
}
```

### 8.1 模式策略矩阵

| 模式 | 计入排行榜 | 刷新恢复 | Back 后 Forward 恢复 | 多标签页 | 心跳 |
|---|---:|---:|---:|---:|---:|
| `RANKED` | 是 | 否 | 否 | 禁止 | 必须 |
| `DAILY` | 是 | 否 | 否 | 禁止 | 必须 |
| `CASUAL` | 否 | 可选 | 否 | 可选 | 推荐 |
| `PRACTICE` | 否 | 可允许 | 可允许 | 可允许 | 可选 |
| `ROOM` | 视规则 | 由房间控制 | 由房间控制 | 由房间控制 | 必须 |

推荐默认：

```txt
排行榜模式 / 正式挑战：
  高约束，不允许恢复。

练习模式：
  低约束，允许体验优先。

多人房间：
  单独走 Room Session，不复用普通 ranked attempt 规则。
```

---

## 9. 后端数据模型设计

### 9.1 GameAttempt 扩展

在现有 `GameAttempt` 上增加以下字段：

```prisma
model GameAttempt {
  id                String         @id @default(cuid())
  userId            String
  gameId            String

  mode              ChallengeMode  @default(RANKED)
  status            AttemptStatus  @default(CREATED)

  difficultyKey     String
  seed              String?
  initialState      Json?
  finalState        Json?
  moveTrace         Json?
  metrics           Json?
  rankingValue      Float?

  entryTokenHash    String?
  playSessionId     String?

  startedAt         DateTime?
  claimedAt         DateTime?
  submittedAt       DateTime?
  completedAt       DateTime?
  abandonedAt       DateTime?
  interruptedAt     DateTime?
  expiresAt         DateTime?
  lastHeartbeatAt   DateTime?

  invalidReason     String?
  abandonReason     String?
  interruptReason   String?

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  user              User           @relation(fields: [userId], references: [id])
  game              Game           @relation(fields: [gameId], references: [id])

  @@index([userId, status])
  @@index([gameId, status])
  @@index([playSessionId])
  @@index([expiresAt])
  @@index([lastHeartbeatAt])
}
```

### 9.2 枚举定义

```prisma
enum ChallengeMode {
  RANKED
  CASUAL
  PRACTICE
  DAILY
  ROOM
}

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
```

### 9.3 高可用相关索引

推荐增加：

```prisma
@@index([userId, mode, status])
@@index([gameId, mode, status])
@@index([status, expiresAt])
@@index([status, lastHeartbeatAt])
@@index([userId, createdAt])
```

用途：

```txt
1. 快速查询用户是否已有 active attempt。
2. 定时任务扫描超时 attempt。
3. 后台管理查询异常挑战。
4. 排行榜计算过滤有效 completed attempt。
```

---

## 10. 后端 API 设计

### 10.1 创建挑战

```http
POST /api/challenges/start
```

请求：

```ts
type StartChallengeRequest = {
  gameSlug: string
  mode: ChallengeMode
  difficultyKey: string
  puzzleSlug?: string
  levelId?: string
  roomId?: string
}
```

响应：

```ts
type StartChallengeResponse = {
  attemptId: string
  gameSlug: string
  mode: ChallengeMode
  difficultyKey: string

  entryToken: string
  playSessionId: string

  seed: string
  initialState: unknown
  maxDurationMs: number
  startedAt: string
  expiresAt: string

  playPath: string
}
```

服务端流程：

```txt
1. 校验用户身份。
2. 校验游戏存在且状态为 PUBLISHED。
3. 校验 mode 是否允许。
4. 校验 difficultyKey 是否存在。
5. 对 RANKED / DAILY 检查用户是否已有 active attempt。
6. 调用对应 GameAdapter.startAttempt。
7. 创建 GameAttempt，状态 CREATED。
8. 生成 entryToken，保存 hash。
9. 生成 playSessionId。
10. 返回 playPath 和初始化数据。
```

### 10.2 认领挑战

```http
POST /api/challenges/:attemptId/claim
```

请求：

```ts
type ClaimChallengeRequest = {
  entryToken: string
  playSessionId: string
}
```

响应：

```ts
type ClaimChallengeResponse = {
  canEnter: boolean
  status: AttemptStatus
  gameSlug: string
  mode: ChallengeMode
  difficultyKey: string
  seed?: string
  initialState?: unknown
  startedAt?: string
  expiresAt?: string
  redirectTo?: string
  reason?: ChallengeInvalidReason
}
```

服务端规则：

```txt
允许 claim：
  status in [CREATED, CLAIMED]
  userId 匹配
  entryToken hash 匹配
  playSessionId 匹配
  未超时
  未被其他 tab/session 认领

拒绝 claim：
  COMPLETED → result
  ABANDONED → expired
  TIMEOUT → expired
  INTERRUPTED → expired
  INVALIDATED → expired
  user 不匹配 → forbidden
  token 不匹配 → invalidated
```

### 10.3 心跳

```http
POST /api/challenges/:attemptId/heartbeat
```

请求：

```ts
type ChallengeHeartbeatRequest = {
  playSessionId: string
  clientNow: string
  phase: 'countdown' | 'playing' | 'submitting'
  localElapsedMs: number
}
```

响应：

```ts
type ChallengeHeartbeatResponse = {
  accepted: boolean
  serverNow: string
  status: AttemptStatus
  remainingMs: number
}
```

服务端逻辑：

```txt
1. 校验用户。
2. 校验 attempt.status === PLAYING。
3. 校验 playSessionId。
4. 更新 lastHeartbeatAt。
5. 如果 now > expiresAt，状态改为 TIMEOUT。
6. 返回剩余时间。
```

推荐间隔：

```txt
RANKED / DAILY：5 秒一次
ROOM：2~5 秒一次
CASUAL：10 秒一次
PRACTICE：可关闭
```

### 10.4 放弃挑战

```http
POST /api/challenges/:attemptId/abandon
```

请求：

```ts
type AbandonChallengeRequest = {
  playSessionId: string
  reason:
    | 'user-back'
    | 'user-click'
    | 'browser-refresh'
    | 'browser-close'
    | 'logout'
    | 'tab-conflict'
    | 'route-replaced'
}
```

响应：

```ts
type AbandonChallengeResponse = {
  accepted: boolean
  status: AttemptStatus
}
```

幂等规则：

```txt
PLAYING / CLAIMED / CREATED → ABANDONED
COMPLETED → 保持 COMPLETED
TIMEOUT → 保持 TIMEOUT
ABANDONED → 保持 ABANDONED
INTERRUPTED → 保持 INTERRUPTED
```

### 10.5 提交挑战

```http
POST /api/challenges/:attemptId/finish
```

请求：

```ts
type FinishChallengeRequest = {
  playSessionId: string
  finalState: unknown
  moveTrace?: unknown[]
  metrics?: Record<string, unknown>
}
```

响应：

```ts
type FinishChallengeResponse = {
  accepted: boolean
  status: AttemptStatus
  result: {
    success: boolean
    score?: number
    durationMs?: number
    rankingValue?: number
    metrics?: Record<string, unknown>
  }
  resultPath: string
}
```

服务端校验：

```txt
1. attempt.status === PLAYING。
2. playSessionId 匹配。
3. 未超时。
4. 未放弃。
5. 未中断。
6. 原子更新 PLAYING → SUBMITTING。
7. 调用 GameAdapter.finishAttempt 或游戏专用提交服务。
8. game-engine 权威验证。
9. 写入 finalState / moveTrace / metrics。
10. 状态改为 COMPLETED。
11. 触发排行榜录入。
```

### 10.6 查询挑战状态

```http
GET /api/challenges/:attemptId/status
```

响应：

```ts
type ChallengeStatusResponse = {
  attemptId: string
  gameSlug: string
  mode: ChallengeMode
  status: AttemptStatus
  startedAt?: string
  completedAt?: string
  expiresAt?: string
  resultPath?: string
  expiredPath?: string
}
```

用途：

```txt
1. result 页面查询结果。
2. expired 页面展示原因。
3. route guard 判断 redirect。
4. 后台管理查看异常 attempt。
```

---

## 11. 前端目录结构

建议新增：

```txt
apps/web/src/
├── challenge/
│   ├── core/
│   │   ├── challenge-navigation-manager.ts
│   │   ├── challenge-runtime-store.ts
│   │   ├── challenge-route-guard.ts
│   │   ├── challenge-blocker.ts
│   │   ├── challenge-heartbeat.ts
│   │   ├── challenge-broadcast.ts
│   │   ├── challenge-policy.ts
│   │   ├── challenge-types.ts
│   │   └── challenge-errors.ts
│   │
│   ├── adapters/
│   │   ├── game-runtime-adapter.ts
│   │   ├── sliding-puzzle.adapter.ts
│   │   ├── life-game.adapter.ts
│   │   ├── precise-character.adapter.ts
│   │   ├── absolute-command.adapter.ts
│   │   └── registry.ts
│   │
│   ├── components/
│   │   ├── ChallengeStartPage.tsx
│   │   ├── ChallengePlayHost.tsx
│   │   ├── ChallengeResultPage.tsx
│   │   ├── ChallengeExpiredPage.tsx
│   │   ├── LeaveChallengeDialog.tsx
│   │   └── ChallengeStatusBoundary.tsx
│   │
│   └── api/
│       ├── challenge-api.ts
│       └── challenge-query-keys.ts
│
├── routes/
│   ├── games.$gameSlug.start.tsx
│   ├── games.$gameSlug.attempts.$attemptId.play.tsx
│   ├── games.$gameSlug.attempts.$attemptId.result.tsx
│   └── games.$gameSlug.attempts.$attemptId.expired.tsx
```

---

## 12. 前端核心接口

### 12.1 GameRuntimeAdapter

新增游戏只需要实现此接口。

```ts
export interface GameRuntimeAdapter<TInit = unknown, TResult = unknown> {
  gameSlug: string

  createPlayPath(input: {
    gameSlug: string
    attemptId: string
    puzzleSlug?: string
    levelId?: string
  }): string

  createResultPath(input: {
    gameSlug: string
    attemptId: string
    puzzleSlug?: string
    levelId?: string
  }): string

  createExpiredPath(input: {
    gameSlug: string
    attemptId: string
    reason?: string
    puzzleSlug?: string
    levelId?: string
  }): string

  resetForNewAttempt(input: {
    attemptId: string
    seed: string
    initialState: TInit
    difficultyKey: string
    startedAt: string
    expiresAt: string
  }): void

  cleanupAfterLeave(input: {
    attemptId: string
    reason: LeaveChallengeReason
  }): void

  cleanupAfterComplete(input: {
    attemptId: string
    result: TResult
  }): void

  canSubmit(): boolean

  buildFinishPayload(): unknown
}
```

### 12.2 ChallengeNavigationManager

```ts
export class ChallengeNavigationManager {
  async startChallenge(input: StartChallengeInput): Promise<void>

  async claimAndEnter(input: {
    attemptId: string
    gameSlug: string
  }): Promise<ClaimChallengeResponse>

  async leaveCurrentChallenge(input: {
    reason: LeaveChallengeReason
    next?: NavigateTarget
  }): Promise<void>

  async completeCurrentChallenge(): Promise<void>

  async redirectToResult(input: {
    attemptId: string
    gameSlug: string
  }): Promise<void>

  async redirectToExpired(input: {
    attemptId: string
    gameSlug: string
    reason: ChallengeInvalidReason
  }): Promise<void>
}
```

### 12.3 ChallengeRuntimeStore

```ts
type ChallengeRuntimeStatus =
  | 'idle'
  | 'created'
  | 'claiming'
  | 'playing'
  | 'submitting'
  | 'completed'
  | 'abandoning'
  | 'abandoned'
  | 'interrupted'
  | 'invalid'

type ChallengeRuntimeStore = {
  current: ChallengeRuntimeSession | null

  setCreated(session: ChallengeRuntimeSession): void
  markClaiming(): void
  markPlaying(): void
  markSubmitting(): void
  markCompleted(): void
  markAbandoning(): void

  clear(reason:
    | 'completed'
    | 'abandoned'
    | 'timeout'
    | 'interrupted'
    | 'invalid'
    | 'logout'
  ): void
}
```

要求：

```txt
1. ranked attempt 不写 localStorage。
2. ranked attempt 不写 sessionStorage。
3. practice attempt 可以按策略写 sessionStorage。
4. logout 时必须 clear。
5. route guard 失败时必须 clear。
```

---

## 13. 前端路由守卫流程

### 13.1 start 页面流程

```txt
用户点击开始挑战
  → ChallengeNavigationManager.startChallenge()
  → POST /api/challenges/start
  → 获得 attemptId / entryToken / playSessionId
  → runtimeStore.setCreated()
  → router.navigate(playPath)
```

伪代码：

```ts
async function handleStart() {
  const res = await challengeApi.start({
    gameSlug,
    mode,
    difficultyKey,
    puzzleSlug,
  })

  challengeRuntimeStore.setCreated({
    attemptId: res.attemptId,
    gameSlug: res.gameSlug,
    mode: res.mode,
    difficultyKey: res.difficultyKey,
    entryToken: res.entryToken,
    playSessionId: res.playSessionId,
    startedAt: res.startedAt,
    expiresAt: res.expiresAt,
    status: 'created',
  })

  router.navigate({
    to: res.playPath,
    replace: false,
  })
}
```

### 13.2 play route beforeLoad

```ts
export const Route = createFileRoute(
  '/games/$gameSlug/attempts/$attemptId/play'
)({
  beforeLoad: async ({ params, context }) => {
    const runtime = context.challengeRuntimeStore.current

    if (!runtime) {
      throw redirect({
        to: '/games/$gameSlug/attempts/$attemptId/expired',
        params,
        search: { reason: 'missing-runtime-session' },
        replace: true,
      })
    }

    if (runtime.attemptId !== params.attemptId) {
      context.challengeRuntimeStore.clear('invalid')

      throw redirect({
        to: '/games/$gameSlug/attempts/$attemptId/expired',
        params,
        search: { reason: 'attempt-mismatch' },
        replace: true,
      })
    }

    if (runtime.gameSlug !== params.gameSlug) {
      context.challengeRuntimeStore.clear('invalid')

      throw redirect({
        to: '/games/$gameSlug/attempts/$attemptId/expired',
        params,
        search: { reason: 'game-mismatch' },
        replace: true,
      })
    }

    const claim = await challengeApi.claim(params.attemptId, {
      entryToken: runtime.entryToken,
      playSessionId: runtime.playSessionId,
    })

    if (!claim.canEnter) {
      context.challengeRuntimeStore.clear('invalid')

      throw redirect({
        to: claim.redirectTo,
        replace: true,
      })
    }

    return {
      challenge: claim,
    }
  },

  component: ChallengePlayHost,
})
```

### 13.3 ChallengePlayHost

```tsx
function ChallengePlayHost() {
  const { challenge } = Route.useLoaderData()
  const adapter = gameRuntimeRegistry.get(challenge.gameSlug)

  useEffect(() => {
    adapter.resetForNewAttempt({
      attemptId: challenge.attemptId,
      seed: challenge.seed,
      initialState: challenge.initialState,
      difficultyKey: challenge.difficultyKey,
      startedAt: challenge.startedAt,
      expiresAt: challenge.expiresAt,
    })

    challengeRuntimeStore.markPlaying()
    challengeHeartbeat.start(challenge.attemptId)

    return () => {
      challengeHeartbeat.stop(challenge.attemptId)
    }
  }, [challenge.attemptId])

  useChallengeBlocker()

  return <GameRenderer gameSlug={challenge.gameSlug} />
}
```

---

## 14. Back / Forward / 站内跳转处理

### 14.1 统一拦截规则

需要拦截：

```txt
1. 浏览器 Back 离开 play
2. 浏览器 Forward 离开 play
3. 点击站内导航离开 play
4. 点击排行榜 / 首页 / 游戏列表
5. logout
6. 切换到其他游戏
```

不拦截：

```txt
1. play 内部 UI 状态变化
2. result 页面跳转
3. expired 页面跳转
4. start 页面跳转
5. 非 active challenge 页面
```

### 14.2 离开确认流程

```txt
PLAYING 页面
  → 触发导航
  → ChallengeBlocker 判断将离开当前 attempt
  → 弹出 LeaveChallengeDialog
  → 用户选择继续挑战
      → blocker.reset()
      → 留在当前页面
  → 用户选择放弃并离开
      → POST /api/challenges/:id/abandon
      → runtimeStore.clear('abandoned')
      → gameAdapter.cleanupAfterLeave()
      → blocker.proceed()
```

### 14.3 LeaveChallengeDialog 文案

```txt
确认离开挑战？

离开后本次挑战将被判定为放弃，不能通过浏览器前进、刷新或重新打开链接恢复。

[继续挑战] [放弃并离开]
```

规则：

```txt
1. 弹窗期间计时不暂停。
2. 弹窗期间 heartbeat 不停止。
3. 用户取消后继续原 challenge。
4. 用户确认后立即 abandon。
```

---

## 15. 刷新 / 关闭处理

### 15.1 正式挑战策略

```txt
RANKED / DAILY：
  刷新后不允许恢复。
```

流程：

```txt
用户刷新
  → beforeunload 尝试提示
  → 用户确认刷新
  → JS runtime 销毁
  → entryToken 丢失
  → 页面重新加载
  → beforeLoad 找不到 runtime
  → redirect expired?reason=refresh
```

### 15.2 sendBeacon 兜底

在页面卸载时尝试上报：

```ts
window.addEventListener('pagehide', () => {
  const current = challengeRuntimeStore.current

  if (!current || current.status !== 'playing') return

  navigator.sendBeacon(
    `/api/challenges/${current.attemptId}/abandon-beacon`,
    JSON.stringify({
      playSessionId: current.playSessionId,
      reason: 'browser-refresh',
    }),
  )
})
```

注意：

```txt
sendBeacon 只能作为尽力而为。
不能依赖它保证状态一致。
最终必须由 heartbeat timeout 兜底。
```

### 15.3 Heartbeat timeout 兜底

服务端定时任务：

```txt
每 10 秒扫描：
  status = PLAYING
  lastHeartbeatAt < now - threshold

更新：
  PLAYING → INTERRUPTED
```

推荐阈值：

```txt
RANKED：15 秒
DAILY：15 秒
ROOM：10 秒
CASUAL：30 秒
```

---

## 16. Forward 恢复处理

核心规则：

```txt
已经离开的 challenge 不能被 forward 恢复。
```

流程：

```txt
用户在 play 中确认离开
  → attempt = ABANDONED
  → runtimeStore.clear()
  → 浏览器 history 中仍可能有旧 play entry
  → 用户点击 Forward
  → play beforeLoad 执行
  → runtime 不存在
  → replace 到 expired
```

不能做：

```txt
不要试图删除 forward history。
不要用 pushState 死循环阻止 forward。
不要在 play mount 时重新 start attempt。
```

应该做：

```txt
允许进入 route match。
在 beforeLoad 中拒绝。
使用 replace 跳 expired，替换旧 play history entry。
```

---

## 17. 多标签页控制

### 17.1 BroadcastChannel

复用现有认证同步思路，新增：

```ts
const challengeChannel = new BroadcastChannel('superbrain-challenge')
```

事件：

```ts
type ChallengeBroadcastEvent =
  | {
      type: 'CHALLENGE_CREATED'
      attemptId: string
      gameSlug: string
      mode: ChallengeMode
    }
  | {
      type: 'CHALLENGE_PLAYING'
      attemptId: string
      gameSlug: string
      playSessionId: string
    }
  | {
      type: 'CHALLENGE_ABANDONED'
      attemptId: string
    }
  | {
      type: 'CHALLENGE_COMPLETED'
      attemptId: string
    }
  | {
      type: 'CHALLENGE_LOGOUT'
    }
```

### 17.2 多标签页策略

推荐：

```txt
RANKED / DAILY：
  同一用户同一时间只允许一个 active challenge。

PRACTICE：
  可以允许多个。

ROOM：
  由房间规则决定。
```

服务端强校验：

```txt
start ranked challenge 前：
  查询 userId + mode in [RANKED, DAILY] + status in [CREATED, CLAIMED, PLAYING, SUBMITTING]

如果存在：
  方案 A：拒绝新 challenge
  方案 B：要求用户先 abandon 旧 challenge
  方案 C：自动 invalidated 旧 challenge
```

推荐使用方案 A：

```txt
拒绝新 challenge，并返回 active attempt 信息。
前端提示用户回到正在进行的挑战或放弃旧挑战。
```

---

## 18. 新游戏接入规范

未来新增游戏时，不允许重复实现路由控制。新游戏只需要完成以下内容。

### 18.1 后端接入

实现：

```ts
interface GameAdapter {
  startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>
  finishAttempt(attempt: GameAttempt, input: FinishAttemptInput): Promise<FinishAttemptResult>
}
```

如果游戏有实时提交：

```ts
interface RealtimeGameAdapter extends GameAdapter {
  submitStep?(attempt: GameAttempt, input: unknown): Promise<StepSubmitResult>
  submitRound?(attempt: GameAttempt, input: unknown): Promise<RoundSubmitResult>
  validateLiveAction?(attempt: GameAttempt, input: unknown): Promise<LiveActionResult>
}
```

所有实时接口必须校验：

```txt
attempt.status === PLAYING
playSessionId 匹配
userId 匹配
未超时
未放弃
未中断
```

### 18.2 前端接入

实现：

```ts
const newGameRuntimeAdapter: GameRuntimeAdapter = {
  gameSlug: 'new-game',

  createPlayPath(input) {
    return `/games/${input.gameSlug}/attempts/${input.attemptId}/play`
  },

  createResultPath(input) {
    return `/games/${input.gameSlug}/attempts/${input.attemptId}/result`
  },

  createExpiredPath(input) {
    return `/games/${input.gameSlug}/attempts/${input.attemptId}/expired`
  },

  resetForNewAttempt(input) {
    useNewGameStore.getState().resetForNewAttempt(input)
  },

  cleanupAfterLeave(input) {
    useNewGameStore.getState().cleanupAfterLeave(input.reason)
  },

  cleanupAfterComplete(input) {
    useNewGameStore.getState().cleanupAfterComplete(input.result)
  },

  canSubmit() {
    return useNewGameStore.getState().canSubmit()
  },

  buildFinishPayload() {
    return useNewGameStore.getState().buildFinishPayload()
  },
}
```

注册：

```ts
gameRuntimeRegistry.register(newGameRuntimeAdapter)
```

### 18.3 游戏 Store 规范

每个游戏 Store 必须暴露：

```ts
type BaseGameStore = {
  attemptId: string | null
  phase:
    | 'idle'
    | 'initializing'
    | 'countdown'
    | 'playing'
    | 'submitting'
    | 'completed'
    | 'abandoned'
    | 'timeout'
    | 'invalid'

  resetForNewAttempt(input: ResetAttemptInput): void
  cleanupAfterLeave(reason: LeaveChallengeReason): void
  cleanupAfterComplete(result: unknown): void
  canSubmit(): boolean
  buildFinishPayload(): unknown
}
```

禁止：

```txt
1. 在游戏组件 mount 时自动 startAttempt。
2. 根据 URL attemptId 自行恢复本地状态。
3. 在游戏 Store 内直接 navigate。
4. 在游戏 Store 内判断服务端 attempt 是否有效。
5. 将 ranked attempt 的 entryToken 存入 localStorage。
```

---

## 19. 高可用设计

### 19.1 服务端幂等性

以下接口必须幂等：

```txt
POST /challenges/:id/abandon
POST /challenges/:id/heartbeat
GET  /challenges/:id/status
```

提交接口需要防重复：

```txt
POST /challenges/:id/finish
```

策略：

```txt
PLAYING → SUBMITTING 使用数据库事务或条件更新。

只有条件满足时更新：
  where id = attemptId
  and status = PLAYING
  and playSessionId = input.playSessionId

如果更新行数为 0：
  查询当前状态并返回对应结果。
```

### 19.2 数据库事务

完成挑战时：

```txt
transaction:
  1. 条件更新 attempt: PLAYING → SUBMITTING
  2. 调用 game-engine 验证
  3. 写入 finalState / metrics / rankingValue
  4. 更新 attempt: SUBMITTING → COMPLETED
  5. upsert leaderboard entry
  6. 写入 audit log
```

如果验证失败：

```txt
SUBMITTING → INVALIDATED
记录 invalidReason
```

如果服务异常：

```txt
SUBMITTING 可由后台修复任务检查。
超过阈值未完成的 SUBMITTING → INTERRUPTED 或 RETRYABLE_FAILED
```

可选增加：

```ts
enum AttemptStatus {
  // ...
  RETRYABLE_FAILED
}
```

如果希望先保持简单，可以不加 `RETRYABLE_FAILED`，直接记录异常日志，由后台人工处理。

### 19.3 Redis 锁

对高并发场景，尤其是多人房间或重复提交，可使用 Redis 分布式锁：

```txt
lock key:
  challenge:finish:{attemptId}

ttl:
  10 秒
```

用途：

```txt
1. 防止重复 finish。
2. 防止同一 attempt 同时 abandon 和 finish。
3. 防止多标签页同时 claim。
```

但核心一致性仍应由数据库条件更新保证，Redis 锁只是优化。

### 19.4 定时修复任务

新增后台任务：

```txt
ChallengeReaperJob
```

周期：

```txt
每 10 秒或 30 秒执行一次。
```

职责：

```txt
1. PLAYING 且 expiresAt < now → TIMEOUT
2. PLAYING 且 lastHeartbeatAt 过旧 → INTERRUPTED
3. CREATED 超过短时间未 claim → ABANDONED / INTERRUPTED
4. CLAIMED 超过短时间未进入 PLAYING → INTERRUPTED
5. SUBMITTING 超过阈值 → 标记异常
```

---

## 20. 安全与反作弊边界

### 20.1 前端只做体验控制

前端负责：

```txt
1. 弹窗提示
2. 路由拦截
3. 清理本地状态
4. 防止普通误操作
5. 降低非法恢复概率
```

前端不负责：

```txt
1. 判定挑战最终合法性
2. 判定分数可信
3. 判定是否能进排行榜
4. 防止恶意构造请求
```

### 20.2 服务端必须校验

所有挑战相关接口都校验：

```txt
userId
attemptId
gameId
mode
status
playSessionId
expiresAt
difficultyKey
puzzleVersion / levelId
```

所有游戏结果都由 `game-engine` 或游戏专用服务验证。

---

## 21. UI 设计

### 21.1 ChallengeStartPage

内容：

```txt
1. 游戏名称
2. 游戏规则
3. 难度选择
4. 模式选择：正式挑战 / 练习
5. 排行榜说明
6. 开始按钮
```

正式挑战提示：

```txt
正式挑战开始后，刷新页面、离开页面或使用浏览器返回，将导致本次挑战失效。
```

### 21.2 LeaveChallengeDialog

```txt
确认离开挑战？

离开后本次挑战将被判定为放弃，不能通过浏览器前进、刷新或重新打开链接恢复。

[继续挑战] [放弃并离开]
```

### 21.3 ChallengeExpiredPage

根据 reason 展示：

| reason | 展示 |
|---|---|
| `missing-runtime-session` | 当前挑战会话已失效 |
| `abandoned` | 你已离开本次挑战 |
| `refresh` | 页面刷新导致挑战中断 |
| `timeout` | 本次挑战已超时 |
| `interrupted` | 挑战连接中断 |
| `completed` | 本次挑战已完成 |
| `unauthorized` | 无权访问该挑战 |
| `not-found` | 挑战不存在 |

操作按钮：

```txt
重新开始
返回游戏详情
查看排行榜
```

---

## 22. 路由跳转策略

### 22.1 使用 push 的场景

```txt
start → play
game detail → start
game detail → leaderboard
result → leaderboard
```

原因：

```txt
用户可以正常返回上一页。
```

### 22.2 使用 replace 的场景

```txt
非法 play → expired
completed play → result
旧 /play → /start
登录失效 → /login
attempt 状态不匹配 → expired
```

原因：

```txt
替换非法 history entry，减少 back/forward 反复命中错误页面。
```

### 22.3 禁止直接 navigate 的场景

在 play 中禁止业务组件直接写：

```ts
router.navigate({ to: '/games' })
```

必须写：

```ts
challengeNavigationManager.leaveCurrentChallenge({
  reason: 'user-click',
  next: { to: '/games' },
})
```

---

## 23. 当前游戏迁移方案

### 23.1 华容道

从：

```txt
/games/sliding-puzzle/play
```

迁移到：

```txt
/games/sliding-puzzle/start
/games/sliding-puzzle/attempts/$attemptId/play
/games/sliding-puzzle/attempts/$attemptId/result
/games/sliding-puzzle/attempts/$attemptId/expired
```

改造点：

```txt
1. 移除 play 页面自动 start。
2. useSlidingPuzzleStore 增加 BaseGameStore 接口。
3. finish 请求增加 playSessionId。
4. Back 离开后 abandon。
```

### 23.2 生命游戏

特殊点：

```txt
生命游戏存在多区域提交。
```

要求：

```txt
1. 每次 region submission 都校验 playSessionId。
2. attempt 非 PLAYING 时拒绝提交。
3. abandon 后未提交区域不能继续提交。
4. result 页面从服务端读取最终提交情况。
```

### 23.3 精准造字

特殊点：

```txt
精准造字存在轮次提交。
```

要求：

```txt
1. 每轮提交绑定 attemptId + playSessionId。
2. 重复提交同一轮需要幂等处理。
3. 离开后旧轮次提交全部拒绝。
```

### 23.4 绝对指令

特殊点：

```txt
绝对指令有 3D 场景、方向指令日志和 puzzleVersion。
```

要求：

```txt
1. command log 写入前校验 attempt.status。
2. command log 绑定 playSessionId。
3. route guard 失败时不挂载 R3F 场景。
4. puzzleVersion 必须和 start 时一致。
```

---

## 24. 监控与审计

### 24.1 前端埋点

记录：

```txt
challenge_start_clicked
challenge_start_success
challenge_claim_success
challenge_claim_failed
challenge_leave_blocked
challenge_abandon_confirmed
challenge_forward_blocked
challenge_refresh_detected
challenge_finish_clicked
challenge_finish_success
challenge_finish_failed
```

字段：

```ts
type ChallengeEventPayload = {
  attemptId?: string
  gameSlug: string
  mode: ChallengeMode
  difficultyKey?: string
  reason?: string
  routeFrom?: string
  routeTo?: string
  timestamp: string
}
```

### 24.2 后端审计

写入 `AdminAuditLog` 或新增 `ChallengeAuditLog`：

```prisma
model ChallengeAuditLog {
  id          String   @id @default(cuid())
  attemptId  String
  userId      String
  action      String
  fromStatus  String?
  toStatus    String?
  reason      String?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([attemptId])
  @@index([userId])
  @@index([action])
}
```

需要记录：

```txt
START
CLAIM
HEARTBEAT_LOST
ABANDON
TIMEOUT
INTERRUPTED
INVALIDATED
FINISH
COMPLETE
SUBMIT_REJECTED
```

---


## 26. 实施路线

### Phase 1：建立统一模型

完成：

```txt
1. 增加 AttemptStatus / ChallengeMode。
2. 扩展 GameAttempt 字段。
3. 新增 challenge API。
4. start / claim / abandon / heartbeat / status 基础接口。
```

### Phase 2：切断旧 play 自动开始逻辑

完成：

```txt
1. 所有旧 /play 不再 start attempt。
2. 旧 /play redirect 到 /start。
3. 游戏组件移除 mount start 逻辑。
```

### Phase 3：前端 Runtime Gateway

完成：

```txt
1. ChallengeRuntimeStore
2. ChallengeNavigationManager
3. ChallengeRouteGuard
4. ChallengePlayHost
5. GameRuntimeAdapter Registry
```

### Phase 4：接入现有游戏

顺序建议：

```txt
1. 华容道
2. 生命游戏
3. 精准造字
4. 绝对指令
```

原因：

```txt
华容道最简单，适合验证通用模型。
绝对指令最复杂，最后接入可以验证扩展性。
```

### Phase 5：异常处理和高可用

完成：

```txt
1. Heartbeat
2. ChallengeReaperJob
3. BroadcastChannel
4. 幂等 abandon
5. finish 条件更新
6. 审计日志
```

### Phase 6：后台管理接入

管理后台增加：

```txt
1. Active attempts 列表
2. Abandoned / interrupted / invalidated 查询
3. 单个 attempt 状态流转日志
4. 强制终止 attempt
5. 异常提交排查
```

---

## 27. 最终推荐规范

项目后续新增任何游戏，都必须遵守：

```txt
1. 游戏不能直接拥有裸 /play 入口。
2. play route 必须包含 attemptId。
3. play route 必须走 ChallengeRouteGuard。
4. start attempt 只能由 ChallengeNavigationManager 发起。
5. Game Store 不能创建 attempt。
6. Game Store 不能判断 attempt 合法性。
7. ranked attempt 的 entryToken 只能放在内存。
8. finish / step submit / round submit 必须携带 playSessionId。
9. 服务端必须校验 attempt.status。
10. completed / abandoned / timeout / interrupted attempt 永远不能重新进入 play。
```

---

## 29. 需要项目侧判断的点

### 29.1 正式挑战刷新后是否允许恢复？

不允许。


### 29.2 多标签页是否允许同时挑战？

正式挑战不允许，练习模式允许。


### 29.3 离开 play 是否立即判定放弃？

正式挑战立即放弃。