# 最强大脑益智题网页版游戏平台：基础框架 + 数字华容道 MVP 实现文档

> 目标读者：Claude Code / 代码生成代理  
> 目标：生成一个可运行、可扩展、前后端分离的益智游戏平台 MVP，并完成第一个游戏「数字华容道」。

---

## 0. 交付目标

实现一个前后端分离的 Web 项目，支持：

1. 用户注册、登录、刷新登录态、退出登录。
2. 游戏中心：展示所有游戏的基础属性，例如名称、难度、来源、介绍、规则、封面、状态。
3. 可扩展的游戏模块机制：后续可以添加其他益智游戏，不需要重写登录、排行榜、游戏中心、提交成绩等基础设施。
4. 通用排行榜框架：不同游戏允许定义不同的排名指标、排序方向、难度分榜、tie-breaker。
5. 完成首个游戏「数字华容道 / Sliding Puzzle」：
   - 支持 3x3、4x4、5x5 三种难度。
   - 支持开始游戏、移动方块、计时、步数统计、完成检测。
   - 服务端生成初始局面，服务端校验提交的移动序列。
   - 按难度分别维护排行榜。
6. 提供本地开发环境：Docker Compose 启动 PostgreSQL 和 Redis；前后端本地启动命令明确。
7. 提供基础测试：核心 puzzle engine 单元测试、排行榜排序测试、API happy path 测试。

MVP 不做：

1. 实时多人对战。
2. 付费、积分商城、复杂运营后台。
3. 强反作弊系统。MVP 只做服务端 seed、服务端 replay、服务端计时和基础限流。
4. SSR。前端使用纯 SPA，便于前后端分离部署。

---

## 1. 推荐技术栈

### 1.1 Monorepo

使用 `pnpm workspace` 管理：

```txt
apps/web        # React 前端 SPA
apps/api        # NestJS 后端 API
packages/shared # 共享类型、Zod schema、常量
packages/game-engine # 可复用游戏规则引擎，首期包含 sliding-puzzle
```

原因：

- 前后端共享 TypeScript 类型和 Zod schema，减少 API 字段漂移。
- 游戏规则引擎既可被前端用于交互，也可被后端用于成绩校验。
- 后续添加新游戏时，可以按 `packages/game-engine/<game>` + `apps/web/src/features/games/<game>` + `apps/api/src/games/adapters/<game>` 扩展。

### 1.2 Frontend

使用：

- React 19
- Vite
- TypeScript strict mode
- TanStack Router
- TanStack Query
- Zustand
- Tailwind CSS
- shadcn/ui 风格组件结构，可不强依赖 CLI
- Zod
- Vitest + React Testing Library
- Playwright，可先配置但只写最小 e2e

选择理由：

- React + Vite 适合纯前后端分离 SPA，启动快，部署简单。
- TanStack Query 管理服务端状态，排行榜、用户信息、游戏元数据都适合 query/mutation 模型。
- Zustand 管理游戏局部状态，例如当前 board、计时器、move trace；不要把高频游戏状态放入全局 Redux。
- Tailwind 便于快速构建响应式 UI。

### 1.3 Backend

使用：

- NestJS
- TypeScript strict mode
- Prisma ORM
- PostgreSQL
- Redis
- JWT access token + refresh token
- Argon2id password hashing
- Zod 或 class-validator 二选一；建议 API DTO 用 Zod schema，并从 `packages/shared` 复用
- Swagger/OpenAPI
- Vitest 或 Jest；Nest 默认 Jest 也可接受

选择理由：

- NestJS 的 Module / Provider / Guard / Interceptor 结构适合长期维护。
- Prisma + PostgreSQL 适合结构化用户、游戏、成绩、排行榜数据；JSONB 用于不同游戏的扩展 metrics。
- Redis 用于登录限流、排行榜缓存、后续实时榜单或 session cache。MVP 即使只少量使用，也保留集成边界。

### 1.4 Runtime

建议：

- Node.js 使用当前 LTS 主线，不要使用 EOL 版本。
- 包管理器固定为 pnpm。
- 本地数据库使用 Docker Compose。

---

## 2. 总体架构

```txt
Browser
  │
  │ HTTPS / JSON REST
  ▼
apps/web React SPA
  │
  │ /api/*
  ▼
apps/api NestJS
  ├── AuthModule
  ├── UsersModule
  ├── GamesModule
  ├── AttemptsModule
  ├── LeaderboardsModule
  ├── PrismaModule
  └── RedisModule
       │
       ├── PostgreSQL: users, games, attempts, leaderboard definitions, leaderboard entries
       └── Redis: rate limit, optional leaderboard cache
```

关键原则：

1. 前端只负责交互体验，不信任前端提交的最终成绩。
2. 游戏结果提交到后端后，后端必须使用同一套 `game-engine` replay 和校验。
3. 排行榜不要写死在游戏表里，应抽象为 `LeaderboardDefinition` + `LeaderboardEntry`。
4. 每个游戏以 `slug` 作为稳定标识，例如 `sliding-puzzle`。
5. 每次游戏开始生成一个 `GameAttempt`，结束时提交移动记录，后端将 attempt 标记为 `COMPLETED` 或 `INVALID`。

---

## 3. 项目目录

生成如下目录：

```txt
brain-games-platform/
  package.json
  pnpm-workspace.yaml
  turbo.json                         # 可选，但推荐
  tsconfig.base.json
  eslint.config.js
  prettier.config.cjs
  docker-compose.yml
  .env.example
  README.md

  apps/
    web/
      package.json
      index.html
      vite.config.ts
      tsconfig.json
      src/
        main.tsx
        app/
          router.tsx
          providers.tsx
          routes/
            root.tsx
            home.tsx
            login.tsx
            register.tsx
            games.tsx
            game-detail.tsx
            play-sliding-puzzle.tsx
            leaderboard.tsx
        components/
          layout/
          ui/
        features/
          auth/
            api.ts
            hooks.ts
            auth-store.ts
          games/
            api.ts
            types.ts
            game-registry.ts
            sliding-puzzle/
              SlidingPuzzlePage.tsx
              SlidingPuzzleBoard.tsx
              useSlidingPuzzleStore.ts
              components.tsx
          leaderboard/
            api.ts
            LeaderboardTable.tsx
        lib/
          api-client.ts
          query-client.ts
          format.ts
        styles/
          globals.css
        test/

    api/
      package.json
      nest-cli.json
      tsconfig.json
      prisma/
        schema.prisma
        seed.ts
      src/
        main.ts
        app.module.ts
        config/
          env.ts
        common/
          decorators/current-user.decorator.ts
          guards/jwt-auth.guard.ts
          filters/http-exception.filter.ts
        prisma/
          prisma.module.ts
          prisma.service.ts
        redis/
          redis.module.ts
          redis.service.ts
        auth/
          auth.module.ts
          auth.controller.ts
          auth.service.ts
          jwt.strategy.ts
          dto.ts
        users/
          users.module.ts
          users.service.ts
        games/
          games.module.ts
          games.controller.ts
          games.service.ts
          game-adapter.interface.ts
          adapters/
            sliding-puzzle.adapter.ts
        attempts/
          attempts.module.ts
          attempts.controller.ts
          attempts.service.ts
        leaderboards/
          leaderboards.module.ts
          leaderboards.controller.ts
          leaderboards.service.ts
        test/

  packages/
    shared/
      package.json
      tsconfig.json
      src/
        index.ts
        schemas/
          auth.ts
          games.ts
          attempts.ts
          leaderboards.ts
        types.ts
        constants.ts

    game-engine/
      package.json
      tsconfig.json
      src/
        index.ts
        sliding-puzzle/
          index.ts
          types.ts
          engine.ts
          generator.ts
          validator.ts
          __tests__/
            sliding-puzzle.test.ts
```

---

## 4. 核心领域模型

### 4.1 User

用户基础信息。

字段：

- `id`
- `email`
- `username`
- `passwordHash`
- `avatarUrl`
- `role`: `USER | ADMIN`
- `status`: `ACTIVE | BANNED`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

唯一约束：

- `email`
- `username`

### 4.2 Game

一个游戏的元信息。

字段：

- `id`
- `slug`: 稳定唯一标识，例如 `sliding-puzzle`
- `title`: 中文名，例如 `数字华容道`
- `subtitle`
- `description`
- `source`: 来源，例如 `最强大脑 / 经典滑块谜题`
- `coverUrl`
- `status`: `DRAFT | PUBLISHED | ARCHIVED`
- `difficultyLevels`: JSON，例如 `[{"key":"easy","label":"3x3","size":3}]`
- `metadata`: JSONB，放扩展信息
- `createdAt`
- `updatedAt`

### 4.3 GameAttempt

一次游戏尝试。

字段：

- `id`
- `userId`
- `gameId`
- `difficultyKey`: 例如 `easy | normal | hard`
- `status`: `STARTED | COMPLETED | INVALID | ABANDONED`
- `seed`: 服务端生成
- `initialState`: JSONB
- `finalState`: JSONB nullable
- `moveTrace`: JSONB nullable
- `metrics`: JSONB，例如 `{ "durationMs": 52341, "moves": 132, "size": 4 }`
- `rankValue`: Decimal nullable，主排序值，例如耗时毫秒
- `startedAt`
- `completedAt`
- `invalidReason`
- `createdAt`

约束：

- attempt 必须属于某个用户。
- 完成时由后端根据服务端时间计算 `durationMs = completedAt - startedAt`。
- 前端提交的 `clientDurationMs` 只用于 UI 和异常检测，不作为权威排名值。

### 4.4 LeaderboardDefinition

排行榜定义，解决“不同游戏目标不同”的问题。

字段：

- `id`
- `gameId`
- `slug`: 例如 `sliding-puzzle-easy-fastest`
- `name`: 例如 `数字华容道 3x3 最快通关榜`
- `scope`: `GLOBAL | FRIENDS | DAILY | WEEKLY`，MVP 只实现 `GLOBAL`
- `difficultyKey`
- `rankMetric`: 例如 `durationMs`、`score`、`accuracy`
- `rankDirection`: `ASC | DESC`
- `tieBreakers`: JSONB，例如 `[{"metric":"moves","direction":"ASC"},{"metric":"completedAt","direction":"ASC"}]`
- `entryPolicy`: `BEST_PER_USER | ALL_ATTEMPTS`，MVP 使用 `BEST_PER_USER`
- `metadata`: JSONB
- `createdAt`

### 4.5 LeaderboardEntry

排行榜条目。为了查询快，保留物化结果。

字段：

- `id`
- `leaderboardDefinitionId`
- `userId`
- `bestAttemptId`
- `rankValue`: Decimal
- `metrics`: JSONB
- `updatedAt`

唯一约束：

- `(leaderboardDefinitionId, userId)`

排序逻辑：

- 根据 `LeaderboardDefinition.rankMetric` 和 `rankDirection` 比较。
- 如果主排序相同，根据 `tieBreakers` 顺序比较。
- MVP 中 entry 更新时只比较当前用户已有 best entry 和新 attempt，若新 attempt 更好则替换。
- 获取榜单时通过数据库 order by 主字段 + JSONB tie-breaker，或者应用层二次排序。MVP 允许先应用层排序，但必须限制返回规模；建议先取前 200 后排序返回前 100。

---

## 5. Prisma Schema 草案

在 `apps/api/prisma/schema.prisma` 生成接近如下结构，可按实际 Prisma 语法修正：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  BANNED
}

enum GameStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum AttemptStatus {
  STARTED
  COMPLETED
  INVALID
  ABANDONED
}

enum RankDirection {
  ASC
  DESC
}

enum LeaderboardScope {
  GLOBAL
  DAILY
  WEEKLY
  FRIENDS
}

enum EntryPolicy {
  BEST_PER_USER
  ALL_ATTEMPTS
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  username     String       @unique
  passwordHash String
  avatarUrl    String?
  role         UserRole     @default(USER)
  status       UserStatus   @default(ACTIVE)
  lastLoginAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  attempts     GameAttempt[]
  entries      LeaderboardEntry[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Game {
  id               String     @id @default(cuid())
  slug             String     @unique
  title            String
  subtitle         String?
  description      String
  source           String?
  coverUrl         String?
  status           GameStatus @default(DRAFT)
  difficultyLevels Json
  metadata         Json       @default("{}")
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  attempts         GameAttempt[]
  leaderboards     LeaderboardDefinition[]
}

model GameAttempt {
  id             String        @id @default(cuid())
  userId         String
  gameId         String
  difficultyKey  String
  status         AttemptStatus @default(STARTED)
  seed           String
  initialState   Json
  finalState     Json?
  moveTrace      Json?
  metrics        Json          @default("{}")
  rankValue      Decimal?
  startedAt      DateTime      @default(now())
  completedAt    DateTime?
  invalidReason  String?
  createdAt      DateTime      @default(now())

  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  game           Game          @relation(fields: [gameId], references: [id], onDelete: Cascade)
  entries        LeaderboardEntry[]

  @@index([userId, gameId, difficultyKey, status])
  @@index([gameId, difficultyKey, status, rankValue])
}

model LeaderboardDefinition {
  id             String            @id @default(cuid())
  gameId         String
  slug           String            @unique
  name           String
  scope          LeaderboardScope  @default(GLOBAL)
  difficultyKey  String?
  rankMetric     String
  rankDirection  RankDirection
  tieBreakers    Json              @default("[]")
  entryPolicy    EntryPolicy       @default(BEST_PER_USER)
  metadata       Json              @default("{}")
  createdAt      DateTime          @default(now())

  game           Game              @relation(fields: [gameId], references: [id], onDelete: Cascade)
  entries        LeaderboardEntry[]

  @@index([gameId, difficultyKey])
}

model LeaderboardEntry {
  id                      String   @id @default(cuid())
  leaderboardDefinitionId String
  userId                  String
  bestAttemptId           String
  rankValue               Decimal
  metrics                 Json     @default("{}")
  updatedAt               DateTime @updatedAt

  leaderboardDefinition   LeaderboardDefinition @relation(fields: [leaderboardDefinitionId], references: [id], onDelete: Cascade)
  user                    User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  bestAttempt             GameAttempt           @relation(fields: [bestAttemptId], references: [id], onDelete: Cascade)

  @@unique([leaderboardDefinitionId, userId])
  @@index([leaderboardDefinitionId, rankValue])
}
```

如果 Prisma 对 JSON default 字符串有兼容问题，改为迁移 SQL 或在 seed/service 层显式写入默认 JSON。

---

## 6. API 设计

统一前缀：`/api`

### 6.1 Auth

#### POST `/api/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "username": "brain_user",
  "password": "Password123456"
}
```

Response:

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "brain_user",
    "role": "USER"
  },
  "accessToken": "..."
}
```

同时设置 refresh token httpOnly cookie。

#### POST `/api/auth/login`

Request:

```json
{
  "emailOrUsername": "brain_user",
  "password": "Password123456"
}
```

Response 同 register。

#### POST `/api/auth/refresh`

使用 refresh cookie，返回新 access token，并轮换 refresh token。

#### POST `/api/auth/logout`

撤销 refresh token，清空 cookie。

#### GET `/api/auth/me`

需要 access token。

---

### 6.2 Games

#### GET `/api/games`

返回已发布游戏列表。

Query:

- `status` 可选，普通用户默认只看 `PUBLISHED`。

Response:

```json
{
  "items": [
    {
      "slug": "sliding-puzzle",
      "title": "数字华容道",
      "subtitle": "滑动数字方块，复原顺序",
      "description": "...",
      "source": "经典滑块谜题 / 最强大脑风格益智题",
      "difficultyLevels": [
        { "key": "easy", "label": "3x3", "size": 3 },
        { "key": "normal", "label": "4x4", "size": 4 },
        { "key": "hard", "label": "5x5", "size": 5 }
      ]
    }
  ]
}
```

#### GET `/api/games/:slug`

返回单个游戏详情。

---

### 6.3 Attempts

#### POST `/api/games/:slug/attempts/start`

需要登录。

Request:

```json
{
  "difficultyKey": "normal"
}
```

Response:

```json
{
  "attemptId": "...",
  "gameSlug": "sliding-puzzle",
  "difficultyKey": "normal",
  "seed": "...",
  "initialState": {
    "size": 4,
    "board": [1, 5, 2, 3, 4, 6, 7, 8, 9, 10, 0, 11, 13, 14, 15, 12]
  },
  "startedAt": "2026-05-10T12:00:00.000Z"
}
```

后端行为：

1. 校验 game slug 和 difficulty。
2. 使用服务端 seed 生成可解局面。
3. 创建 `GameAttempt(status=STARTED)`。
4. 返回 initial state。

#### POST `/api/games/:slug/attempts/:attemptId/finish`

需要登录。

Request:

```json
{
  "finalState": {
    "size": 4,
    "board": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
  },
  "moveTrace": [5, 1, 2, 6],
  "clientDurationMs": 52341
}
```

`moveTrace` 表示每一步移动的 tile number，而不是方向。服务端从 `initialState` 开始 replay：每个 tile 必须与空格相邻，移动后最终必须 solved。

Response success:

```json
{
  "attemptId": "...",
  "status": "COMPLETED",
  "metrics": {
    "durationMs": 52341,
    "moves": 132,
    "size": 4
  },
  "leaderboardUpdated": true,
  "personalBest": true
}
```

Response invalid:

```json
{
  "attemptId": "...",
  "status": "INVALID",
  "reason": "ILLEGAL_MOVE_AT_INDEX_12"
}
```

后端行为：

1. 校验 attempt 属于当前用户。
2. 校验 attempt 状态必须是 `STARTED`。
3. 使用服务端保存的 `initialState` 和提交的 `moveTrace` replay。
4. 校验最终局面 solved。
5. 计算服务端耗时：`completedAt - startedAt`。
6. 记录 metrics：`durationMs`、`moves`、`size`。
7. 更新对应排行榜。
8. 返回本次成绩和是否刷新个人最佳。

---

### 6.4 Leaderboards

#### GET `/api/games/:slug/leaderboards`

返回该游戏的排行榜定义。

#### GET `/api/leaderboards/:leaderboardSlug/entries`

Query:

- `limit`: 默认 50，最大 100
- `offset`: 默认 0

Response:

```json
{
  "leaderboard": {
    "slug": "sliding-puzzle-normal-fastest",
    "name": "数字华容道 4x4 最快通关榜",
    "rankMetric": "durationMs",
    "rankDirection": "ASC",
    "tieBreakers": [
      { "metric": "moves", "direction": "ASC" },
      { "metric": "completedAt", "direction": "ASC" }
    ]
  },
  "items": [
    {
      "rank": 1,
      "user": { "id": "...", "username": "alice" },
      "metrics": { "durationMs": 32000, "moves": 98, "size": 4 },
      "completedAt": "2026-05-10T12:00:00.000Z"
    }
  ]
}
```

---

## 7. 通用游戏扩展机制

### 7.1 后端 GameAdapter 接口

在 `apps/api/src/games/game-adapter.interface.ts`：

```ts
export interface StartAttemptInput {
  userId: string;
  gameId: string;
  difficultyKey: string;
}

export interface StartAttemptResult {
  seed: string;
  initialState: unknown;
  metrics?: Record<string, unknown>;
}

export interface FinishAttemptInput {
  attempt: {
    id: string;
    seed: string;
    initialState: unknown;
    difficultyKey: string;
    startedAt: Date;
  };
  payload: unknown;
  completedAt: Date;
}

export interface FinishAttemptResult {
  valid: boolean;
  invalidReason?: string;
  finalState?: unknown;
  moveTrace?: unknown;
  metrics?: Record<string, unknown>;
  rankValue?: number;
}

export interface GameAdapter {
  slug: string;
  startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>;
  finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult>;
}
```

`GamesModule` 维护 adapter registry：

```ts
const adapters = new Map<string, GameAdapter>();
adapters.set(slidingPuzzleAdapter.slug, slidingPuzzleAdapter);
```

新增游戏时只需要新增 adapter 并注册，不改 attempts 通用流程。

### 7.2 前端 Game Registry

在 `apps/web/src/features/games/game-registry.ts`：

```ts
export interface WebGameDefinition {
  slug: string;
  playRoute: string;
  component: React.LazyExoticComponent<React.ComponentType>;
}

export const webGameRegistry: Record<string, WebGameDefinition> = {
  "sliding-puzzle": {
    slug: "sliding-puzzle",
    playRoute: "/games/sliding-puzzle/play",
    component: lazy(() => import("./sliding-puzzle/SlidingPuzzlePage")),
  },
};
```

新增游戏时增加一个 feature 目录，并注册路由。

---

## 8. 数字华容道实现规格

### 8.1 游戏定义

slug：`sliding-puzzle`  
中文名：`数字华容道`  
目标：滑动数字方块，使棋盘恢复为从左到右、从上到下递增，空格在右下角。

难度：

```ts
const SLIDING_PUZZLE_DIFFICULTIES = [
  { key: "easy", label: "3x3", size: 3, scrambleMoves: 60 },
  { key: "normal", label: "4x4", size: 4, scrambleMoves: 160 },
  { key: "hard", label: "5x5", size: 5, scrambleMoves: 300 },
] as const;
```

排行榜：

1. `sliding-puzzle-easy-fastest`
   - difficultyKey: `easy`
   - rankMetric: `durationMs`
   - rankDirection: `ASC`
   - tieBreakers: `moves ASC`, `completedAt ASC`
2. `sliding-puzzle-normal-fastest`
   - difficultyKey: `normal`
   - rankMetric: `durationMs`
   - rankDirection: `ASC`
   - tieBreakers: `moves ASC`, `completedAt ASC`
3. `sliding-puzzle-hard-fastest`
   - difficultyKey: `hard`
   - rankMetric: `durationMs`
   - rankDirection: `ASC`
   - tieBreakers: `moves ASC`, `completedAt ASC`

### 8.2 Board 表示

一维数组：

```ts
type Tile = number; // 0 表示空格
interface SlidingPuzzleState {
  size: number;
  board: Tile[];
}
```

4x4 完成状态：

```ts
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
```

### 8.3 共享引擎函数

在 `packages/game-engine/src/sliding-puzzle/engine.ts` 实现：

```ts
export function createSolvedBoard(size: number): number[];
export function isSolved(state: SlidingPuzzleState): boolean;
export function getBlankIndex(board: number[]): number;
export function areAdjacent(indexA: number, indexB: number, size: number): boolean;
export function canMoveTile(state: SlidingPuzzleState, tile: number): boolean;
export function moveTile(state: SlidingPuzzleState, tile: number): SlidingPuzzleState;
export function replayMoves(initial: SlidingPuzzleState, moves: number[]): {
  valid: boolean;
  finalState: SlidingPuzzleState;
  invalidMoveIndex?: number;
  reason?: string;
};
```

### 8.4 生成可解局面

在 `generator.ts` 实现 deterministic scramble，不使用纯随机 permutation 作为首选。

算法：

1. 从 solved board 开始。
2. 用 seed 初始化 deterministic PRNG。
3. 每一步找出空格相邻可移动 tile。
4. 随机选择一个 tile 移动。
5. 避免立即撤销上一步，除非没有其他选择。
6. 重复 `scrambleMoves` 次。
7. 如果最终仍然 solved，则额外 scramble 若干步。

函数：

```ts
export function generateSlidingPuzzleInitialState(input: {
  size: number;
  seed: string;
  scrambleMoves: number;
}): SlidingPuzzleState;
```

PRNG 要可复现。可以实现一个简单 hash-based PRNG，例如 mulberry32 + xmur3，避免引入额外包。

### 8.5 服务端校验

`SlidingPuzzleAdapter.finishAttempt`：

1. 用 Zod 校验 payload：
   - `finalState.size` 与 difficulty size 一致。
   - `finalState.board` 长度正确。
   - `moveTrace` 是正整数数组。
   - 最大步数限制：3x3 不超过 2000，4x4 不超过 10000，5x5 不超过 30000。超过判 invalid，防止恶意 payload。
2. 从 attempt.initialState replay `moveTrace`。
3. 如果 replay 非法，返回 invalid。
4. 如果 replay 后不是 solved，返回 invalid。
5. 如果 replay final 与 payload.finalState 不一致，返回 invalid。
6. 计算：
   - `durationMs = completedAt.getTime() - attempt.startedAt.getTime()`
   - `moves = moveTrace.length`
   - `size`
7. duration 边界：
   - 小于 1000ms 判 suspicious，可标记 invalid 或保留但不进榜。MVP 建议 invalid。
   - 大于 24h 判 invalid。
8. 返回 rankValue = durationMs。

### 8.6 前端交互

页面：`/games/sliding-puzzle/play`

功能：

1. 难度选择：3x3 / 4x4 / 5x5。
2. 点击「开始」后调用 start attempt。
3. 收到 initialState 后渲染棋盘，并启动本地 UI 计时器。
4. 用户点击与空格相邻的 tile 才能移动。
5. 每次移动：
   - 更新 board。
   - `moves += 1`。
   - `moveTrace.push(tile)`。
6. 检测 solved：
   - 停止本地计时。
   - 调用 finish API。
   - 展示服务端确认后的成绩。
   - 刷新排行榜和个人最佳。
7. 提供「重新开始」按钮：放弃当前本地状态，重新 start attempt。
8. 未登录用户点击开始时跳转登录页，登录后回到游戏页。

UI 要求：

- 桌面端居中棋盘，右侧展示规则、用时、步数、当前难度、排行榜入口。
- 移动端棋盘全宽，信息区在下方。
- tile 需要有简单过渡动画。
- 空格用透明块显示。
- 已完成时棋盘锁定。

---

## 9. 排行榜更新逻辑

在 `LeaderboardsService.recordAttemptResult(attempt)` 中实现：

输入必须是 `COMPLETED` attempt。

流程：

1. 查找 game + difficulty 对应的 leaderboard definitions。
2. 对每个 definition：
   - 检查 attempt.metrics 是否包含 rankMetric。
   - 根据 rankDirection 计算是否优于当前用户已有 entry。
   - 如果没有 entry，创建。
   - 如果更好，更新 `bestAttemptId`、`rankValue`、`metrics`。
   - 如果不更好，不更新。
3. 返回是否更新个人最佳。

比较函数：

```ts
function isBetterAttempt(params: {
  candidate: { rankValue: number; metrics: Record<string, unknown>; completedAt: Date };
  current: { rankValue: number; metrics: Record<string, unknown>; completedAt: Date };
  direction: "ASC" | "DESC";
  tieBreakers: Array<{ metric: string; direction: "ASC" | "DESC" }>;
}): boolean
```

对于数字华容道：

1. `durationMs` 更小者更好。
2. duration 相等时，`moves` 更少者更好。
3. moves 相等时，更早完成者更好。

---

## 10. Seed 数据

`apps/api/prisma/seed.ts` 必须创建：

1. 游戏 `sliding-puzzle`。
2. 三个 leaderboard definitions。
3. 可选 demo user：
   - email: `demo@example.com`
   - username: `demo`
   - password: `Demo123456`

不要在生产环境 seed demo password。

Game seed 示例：

```ts
{
  slug: "sliding-puzzle",
  title: "数字华容道",
  subtitle: "滑动数字方块，复原顺序",
  description: "在 N x N 棋盘中移动数字方块，使其按从小到大排列，空格位于右下角。",
  source: "经典滑块谜题 / 最强大脑风格益智题",
  status: "PUBLISHED",
  difficultyLevels: [
    { key: "easy", label: "3x3", size: 3, scrambleMoves: 60 },
    { key: "normal", label: "4x4", size: 4, scrambleMoves: 160 },
    { key: "hard", label: "5x5", size: 5, scrambleMoves: 300 }
  ],
  metadata: {
    tags: ["空间推理", "路径规划", "经典谜题"],
    estimatedDuration: "1-10 min"
  }
}
```

---

## 11. 安全与反作弊边界

MVP 必须实现：

1. 密码 Argon2id hash，不保存明文。
2. access token 短有效期，例如 15 分钟。
3. refresh token 存 httpOnly cookie，数据库只保存 hash。
4. 登录接口限流。
5. finish attempt 接口限流。
6. attempt 必须归属于当前用户。
7. attempt 只能完成一次。
8. 服务端 replay moveTrace。
9. 服务端计时为排行榜唯一时间来源。
10. CORS 只允许配置中的前端 origin。

MVP 不解决：

1. 用户用脚本自动求解。
2. 用户模拟合法 moveTrace 但非人工操作。
3. 多账号刷榜。

为后续保留：

- `SubmissionAudit` 表。
- 设备指纹。
- suspicious flag。
- replay 可视化审核。
- 更复杂的 puzzle 反作弊，例如最短路径下界检测、异常移动频率检测。

---

## 12. 前端页面清单

### `/`

首页：

- 平台标题。
- 简短介绍。
- 进入游戏中心按钮。
- 登录/注册入口。

### `/login`

登录页。

### `/register`

注册页。

### `/games`

游戏列表：

- 卡片展示 `title`、`subtitle`、`source`、难度标签。
- 点击进入详情。

### `/games/:slug`

游戏详情：

- 介绍、规则、难度。
- 「开始游戏」按钮。
- 「查看排行榜」按钮。

### `/games/sliding-puzzle/play`

数字华容道游戏页。

### `/games/:slug/leaderboards`

该游戏排行榜页：

- 难度 tab。
- 排行榜表格。
- 当前用户个人最佳。

---

## 13. 代码质量要求

1. TypeScript 开启 strict。
2. 共享 schema 放在 `packages/shared`。
3. API 响应统一结构，但不要过度包装错误。
4. 所有外部输入必须校验。
5. 后端 service 不直接依赖 controller DTO；controller 负责解析，service 负责业务。
6. 游戏规则不要写在 React 组件里，必须复用 `packages/game-engine`。
7. 不要在前端写死排行榜规则；排行榜定义从后端返回。
8. 不要在数据库中只保存最终成绩，必须保存 attempt 和 replay 所需数据。
9. README 必须包含本地启动步骤。

---

## 14. 测试要求

### 14.1 game-engine 单元测试

覆盖：

1. `createSolvedBoard(3)` 输出 `[1,2,3,4,5,6,7,8,0]`。
2. `isSolved` 正确识别完成/未完成。
3. 非相邻 tile 不能移动。
4. 相邻 tile 移动后 board 正确。
5. `replayMoves` 对合法序列返回 valid。
6. `replayMoves` 对非法序列返回 invalid 和 invalidMoveIndex。
7. 同一 seed 生成同一 initialState。
8. 生成局面不等于 solved。
9. 生成局面可通过反向或 replay 逻辑验证为可达。

### 14.2 leaderboard 单元测试

覆盖：

1. ASC 主指标更小者胜。
2. DESC 主指标更大者胜。
3. tie-breaker 生效。
4. 不刷新较差成绩。
5. 刷新更好成绩。

### 14.3 API 测试

覆盖 happy path：

1. register。
2. login。
3. get games。
4. start sliding-puzzle attempt。
5. 使用 engine 构造一个可完成的简单 attempt 并 finish。
6. leaderboard 出现该用户。

MVP 可以使用测试数据库或 mock Prisma；优先测试关键 service。

---

## 15. README 本地启动要求

README 必须包含：

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

期望服务：

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

`.env.example` 至少包含：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brain_games?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="replace-me-access-secret"
JWT_REFRESH_SECRET="replace-me-refresh-secret"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL_DAYS="30"
WEB_ORIGIN="http://localhost:5173"
API_PORT="3000"
NODE_ENV="development"
```

---

## 16. Docker Compose

`docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:16
    container_name: brain-games-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: brain_games
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: brain-games-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 17. Claude Code 执行步骤

请按以下顺序实现，不要跳步：

### Step 1：初始化 monorepo

1. 创建根目录配置：`package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`.gitignore`、`.env.example`、`docker-compose.yml`、`README.md`。
2. 创建 `apps/web`、`apps/api`、`packages/shared`、`packages/game-engine`。
3. 配置根命令：

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "db:migrate": "pnpm --filter api prisma migrate dev",
    "db:seed": "pnpm --filter api prisma db seed",
    "db:studio": "pnpm --filter api prisma studio"
  }
}
```

### Step 2：实现 shared package

1. 定义 auth、games、attempts、leaderboards 的 Zod schema。
2. 导出 TypeScript 类型。
3. 定义通用常量，例如 game slug、difficulty keys。

### Step 3：实现 game-engine package

1. 实现 sliding puzzle engine。
2. 实现 deterministic generator。
3. 实现 validator/replay。
4. 写单元测试。

### Step 4：实现 API 基础设施

1. NestJS app。
2. Config/env 校验。
3. Prisma module。
4. Redis module。
5. 全局 validation/error filter。
6. Swagger/OpenAPI。
7. CORS。

### Step 5：实现 Auth

1. register/login/refresh/logout/me。
2. Argon2id password hashing。
3. JWT access token。
4. Refresh token rotation。
5. JwtAuthGuard。

### Step 6：实现 Games/Attempts/Leaderboards

1. GamesService 读取 game 元信息。
2. AttemptsService 统一 start/finish 流程。
3. SlidingPuzzleAdapter 接入 game-engine。
4. LeaderboardsService 实现 best-per-user 更新。
5. Prisma seed 初始化数字华容道和排行榜。

### Step 7：实现 Web

1. React app + router + query client。
2. API client，自动带 Authorization header。
3. Auth store。
4. 登录/注册页面。
5. 游戏列表/详情页面。
6. 数字华容道游戏页。
7. 排行榜页面。

### Step 8：联调和测试

1. 跑 `pnpm test`。
2. 跑 `pnpm build`。
3. 本地完成一次 register → start game → finish game → leaderboard update。
4. README 补充已知限制。

---

## 18. 验收标准

满足以下全部条件才算完成：

1. `docker compose up -d` 能启动 PostgreSQL 和 Redis。
2. `pnpm install` 成功。
3. `pnpm db:migrate && pnpm db:seed` 成功。
4. `pnpm dev` 后：
   - API 可访问。
   - Web 可访问。
5. 用户可以注册、登录、刷新页面后保持登录态。
6. `/games` 可以看到「数字华容道」。
7. 可以选择 3x3、4x4、5x5 开始游戏。
8. 方块移动规则正确，非相邻 tile 不能移动。
9. 完成后能提交成绩。
10. 服务端能 replay 校验移动序列。
11. 排行榜按难度展示。
12. 同一用户同一榜单只保留最好成绩。
13. 更差成绩不会覆盖个人最佳。
14. `pnpm test` 通过。
15. `pnpm build` 通过。

---

## 19. 后续扩展方向

### 添加新游戏时的最小改动路径

1. 在 `Game` seed 中新增游戏 metadata。
2. 在 `LeaderboardDefinition` seed 中新增该游戏的榜单定义。
3. 在 `packages/game-engine` 新增游戏规则和 validator。
4. 在后端新增 `GameAdapter`。
5. 在前端新增游戏组件并注册到 `webGameRegistry`。

### 后台管理

后续可以添加：

- 管理员创建/编辑 Game。
- 管理员配置 LeaderboardDefinition。
- 审核异常 attempt。
- 上传游戏封面。

### 更强排行榜

后续可以添加：

- 日榜、周榜、月榜。
- 好友榜。
- 分段榜，例如按设备、地区、版本。
- Redis sorted set 加速榜单查询。
- 定时物化 rank。

### 更强反作弊

后续可以添加：

- move 时间戳序列。
- 最短路径估计。
- 人类操作速度阈值。
- 异常检测分数。
- 高排名 replay 回放审核。

---

## 20. 实现偏好

1. 先保证 MVP 跑通，不要过早抽象复杂插件系统。
2. 但数据库层和 service 层必须保留扩展字段：`metadata`、`metrics`、`LeaderboardDefinition`。
3. 游戏规则必须共享，不能前后端各写一套。
4. 服务端是成绩可信边界。
5. 前端优先清晰可维护，不追求过度动画。
6. 所有核心命令必须写入 README。

