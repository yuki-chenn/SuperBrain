# Framework — 项目架构速览

本文档给出项目的总体架构、关键模块、主要数据流以及开发者快速上手要点，便于新开发者在短时间内了解代码库。

## 项目概览

- 名称：Brain Games Platform（SuperBrain）
- 栈：Frontend — React + Vite；Backend — NestJS；数据库 — PostgreSQL（Prisma）；缓存 — Redis；包管理 — pnpm monorepo
- 代码组织：
  - `apps/web`：React SPA 前端，路由与页面
  - `apps/api`：NestJS 后端，控制器/服务/模块
  - `packages/shared`：共享 Zod 模式、配置与常量
  - `packages/game-engine`：可重用的游戏引擎（生成、校验、回放、验证工具）

## 关键设计要点

- Game Adapter Pattern：后端以 `GameAdapter` 接口抽象每个游戏的 `startAttempt` / `finishAttempt` 行为，具体实现为各游戏的 Adapter（例如 life-game、sliding-puzzle、precise-character-building）。详见 `apps/api/src/games/game-adapter.interface.ts`。
- 数据驱动与种子库：游戏题目（如 LifePuzzle、PreciseCharacterPuzzle）由种子脚本预生成并写入 DB，`pnpm db:seed` 会填充题库和字根/组合词典。
- 服务端权威校验：所有游戏判定（回放验证、回合验证、局部提交验证）均在服务端通过 `packages/game-engine` 或服务端逻辑进行，客户端仅作展示与交互。
- 共享常量：困难级别、超时、最大移动数等权威常量在 `packages/shared` 中定义，前后端共用。

## 主要模块（快速浏览）

- 后端入口与模块
  - API 入口：[apps/api/src/main.ts](apps/api/src/main.ts)
  - 核心模块：[apps/api/src/app.module.ts](apps/api/src/app.module.ts)
  - 游戏注册与适配：`GamesService`、`GamesModule`（[apps/api/src/games/games.service.ts](apps/api/src/games/games.service.ts)）

- 前端入口与路由
  - 前端入口：[apps/web/src/main.tsx](apps/web/src/main.tsx)
  - 路由定义：[apps/web/src/app/router.tsx](apps/web/src/app/router.tsx)
  - Web 端游戏注册：`apps/web/src/features/games/game-registry.ts`

- 共享与引擎
  - 共享常量/模式：[packages/shared/src/index.ts](packages/shared/src/index.ts)
  - 游戏引擎根：[packages/game-engine/src/index.ts](packages/game-engine/src/index.ts)

- 数据模型（Prisma）
  - 模式文件：[apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
  - 关键模型：`Game`, `GameAttempt`, `LifePuzzle`, `PreciseCharacterPuzzle`, `Leaderboards` 等

## 典型请求流程

1. 启动尝试（Start Attempt）
   - Client → POST `/games/:slug/attempts/start`
   - 后端通过对应 Adapter 生成 `seed` 与 `initialState`，并创建 `GameAttempt` 行记录（seed、initialState、metadata、startedAt）

2. 游戏进行与提交
   - Sliding puzzle：客户端提交 `moveTrace` + `finalState` 到 `/attempts/:id/finish`，后端用引擎回放并验证；验证通过则标记 `COMPLETED` 并记录 `metrics` 与 `rankValue`
   - Life game：按区域提交到 `/games/life-game/attempts/:id/regions/:regionId/submit`；服务端验证局部解答并在全部目标完成时标记 `COMPLETED`
   - Precise character：按回合提交到专属回合提交端点，服务端校验路径/字根/组合并推进状态或登记失败

3. 计时与失效
   - 每个难度有 `maxDurationMs`，超时由服务端检测并将 `GameAttempt` 标记为 `INVALID/TIMEOUT`（读取时自动失效）。滑动拼图还有 `MIN_DURATION_MS` 抗刷策略。

4. 排行榜
   - `LeaderboardsService` 负责在尝试完成后计算并写入排行榜条目（`LeaderboardDefinition` 与 `LeaderboardEntry`），排名依据 `rankValue` 及附加 tiebreakers

## 开发与运行（快速上手）

1. 环境准备

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

2. 单服务运行

```bash
pnpm --filter api dev    # 启动后端
pnpm --filter web dev    # 启动前端
```

## 重要文件索引（便于跳转）

- API 入口：[apps/api/src/main.ts](apps/api/src/main.ts)
- App 模块：[apps/api/src/app.module.ts](apps/api/src/app.module.ts)
- Prisma schema：[apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
- GameAdapter：[apps/api/src/games/game-adapter.interface.ts](apps/api/src/games/game-adapter.interface.ts)
- Games 服务：[apps/api/src/games/games.service.ts](apps/api/src/games/games.service.ts)
- Web 入口：[apps/web/src/main.tsx](apps/web/src/main.tsx)
- Web 路由：[apps/web/src/app/router.tsx](apps/web/src/app/router.tsx)
- Shared：[packages/shared/src/index.ts](packages/shared/src/index.ts)
- Game engine：[packages/game-engine/src/index.ts](packages/game-engine/src/index.ts)
- 规格文档：`openspec/specs/*`（例如 [openspec/specs/life-game/spec.md](openspec/specs/life-game/spec.md)）

