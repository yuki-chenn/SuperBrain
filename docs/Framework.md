# SuperBrain 技术架构文档

## 1. 项目概述

SuperBrain（最强大脑）是一个基于 Web 的益智游戏平台，灵感来源于同名电视节目。平台包含多款脑力训练游戏，支持排行榜、用户认证和后台管理系统。

**项目名称：** `brain-games-platform`

---

## 2. 整体架构

### 2.1 Monorepo 结构

项目采用 **pnpm workspace + Turborepo** 管理的 Monorepo 架构：

```
SuperBrain/
├── apps/
│   ├── api/          # NestJS 后端 API（端口 3000）
│   ├── web/          # React 玩家前端 SPA（端口 5173）
│   └── admin/        # React 管理后台 SPA（端口 5174）
├── packages/
│   ├── shared/       # @brain-games/shared — Zod Schema、类型定义、游戏配置
│   └── game-engine/  # @brain-games/game-engine — 纯逻辑游戏引擎
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### 2.2 架构分层图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  apps/web    │  │  apps/admin  │  │  (未来客户端)     │   │
│  │  React SPA   │  │  React SPA   │  │                  │   │
│  │  端口 5173   │  │  端口 5174   │  │                  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │
│         │                 │                                  │
│         └────────┬────────┘                                  │
│                  ▼                                           │
│         ┌────────────────┐                                  │
│         │  Vite Proxy    │  /api → localhost:3000            │
│         └────────┬───────┘                                  │
├──────────────────┼──────────────────────────────────────────┤
│                  ▼          服务层                           │
│         ┌────────────────────────────────┐                  │
│         │       apps/api (NestJS)        │                  │
│         │       端口 3000                │                  │
│         │                                │                  │
│         │  ┌──────────┐ ┌─────────────┐  │                  │
│         │  │ Auth     │ │ Games       │  │                  │
│         │  │ Module   │ │ Module      │  │                  │
│         │  └──────────┘ └─────────────┘  │                  │
│         │  ┌──────────┐ ┌─────────────┐  │                  │
│         │  │ Attempts │ │ Leaderboard │  │                  │
│         │  │ Module   │ │ Module      │  │                  │
│         │  └──────────┘ └─────────────┘  │                  │
│         │  ┌──────────────────────────┐  │                  │
│         │  │ Admin Module             │  │                  │
│         │  └──────────────────────────┘  │                  │
│         └────────────┬───────────────────┘                  │
├──────────────────────┼──────────────────────────────────────┤
│                      ▼          数据层                       │
│         ┌────────────────┐  ┌────────────┐                  │
│         │  PostgreSQL 16  │  │  Redis 7   │                  │
│         │  (Prisma ORM)  │  │  (ioredis) │                  │
│         └────────────────┘  └────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                      共享包层                                │
│  ┌───────────────────────┐  ┌────────────────────────────┐  │
│  │  @brain-games/shared  │  │  @brain-games/game-engine  │  │
│  │  Schema / 类型 / 配置  │  │  纯逻辑引擎 / 验证器       │  │
│  └───────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 技术栈总览

| 层次 | 技术 | 版本 |
|------|------|------|
| **包管理** | pnpm | 11.0.9 |
| **构建编排** | Turborepo | ^2.9.14 |
| **运行时** | Node.js | >= 20 |
| **后端框架** | NestJS | 11 |
| **ORM** | Prisma | 6 |
| **数据库** | PostgreSQL | 16 |
| **缓存** | Redis | 7 (ioredis 5) |
| **认证** | JWT + Passport | — |
| **前端框架** | React | 19 |
| **构建工具** | Vite | 6 |
| **路由** | TanStack Router | 1.90 |
| **数据获取** | TanStack React Query | 5 |
| **状态管理** | Zustand | 5 |
| **样式** | Tailwind CSS | 4 |
| **3D 渲染** | Three.js + React Three Fiber | 0.184 / 9 |
| **Schema 校验** | Zod | 3 |
| **API 文档** | Swagger | — |

---

## 4. 后端架构（apps/api）

### 4.1 NestJS 模块划分

后端采用 NestJS 模块化架构，全局路由前缀 `/api`，Swagger 文档路径 `/api/docs`。

| 模块 | 职责 |
|------|------|
| `PrismaModule` | PostgreSQL 数据库访问 |
| `RedisModule` | Redis 缓存/会话存储 |
| `AuthModule` | 注册、登录、JWT、Session 轮换 |
| `UsersModule` | 用户查询/创建 |
| `GamesModule` | 游戏注册表 + 4 个游戏适配器 |
| `LifeGameModule` | 生命游戏专用端点 |
| `PreciseCharacterGameModule` | 精准造字专用端点 |
| `AbsoluteCommandModule` | 绝对指令专用端点 |
| `AttemptsModule` | 通用挑战生命周期 |
| `LeaderboardsModule` | 排行榜录入与查询 |
| `AdminModule` | 管理后台 API |

### 4.2 核心架构模式

#### 适配器模式（GameAdapter）

所有游戏通过统一的 `GameAdapter` 接口接入：

```typescript
interface GameAdapter {
  startAttempt(userId, gameId, difficultyKey): Promise<StartAttemptResult>
  finishAttempt(attempt, input): Promise<FinishAttemptResult>
}
```

4 个游戏适配器：`SlidingPuzzleAdapter`、`LifeGameAdapter`、`PreciseCharacterBuildingAdapter`、`AbsoluteCommandAdapter`。

需要实时状态的游戏（生命游戏、精准造字、绝对指令）拒绝通用的 `finishAttempt`，使用各自独立的提交端点。

#### 服务端权威验证

所有游戏逻辑在服务端运行，不信任客户端提交的结果：

- **华容道**：服务端完整重放玩家的操作序列，验证最终状态
- **生命游戏**：服务端模拟至稳定态，比对玩家提交的区域答案
- **精准造字**：服务端查表验证偏旁+字根的组合合法性
- **绝对指令**：服务端逐步模拟每个方向指令，维护完整快照

#### Zod 管道校验

请求体通过 `ZodPipe` 使用 `@brain-games/shared` 中的 Schema 进行校验，提供类型安全的边界验证。

### 4.3 认证体系

采用 **JWT Access Token + 不透明 Refresh Token** 的双 Token 方案：

```
┌──────────┐     POST /auth/login      ┌──────────┐
│  客户端   │ ──────────────────────────▶│  服务端   │
│          │◀───────────────────────────│          │
│          │  { accessToken }           │          │
│          │  Set-Cookie: refresh_token  │          │
│          │                            │          │
│          │  GET /api/xxx              │          │
│          │  Authorization: Bearer ... │          │
│          │                            │          │
│          │  401 Unauthorized          │          │
│          │──────────────────────────▶│          │
│          │  POST /auth/refresh        │          │
│          │  Cookie: refresh_token     │          │
│          │◀───────────────────────────│          │
│          │  { accessToken } (轮换)     │          │
└──────────┘                            └──────────┘
```

**关键特性：**
- Access Token：JWT 签名，默认 15 分钟过期
- Refresh Token：64 字节随机字符串，SHA-256 哈希存储，httpOnly Cookie
- Session 机制：基于 `refreshTokenFamilyId` 的轮换 + 重放检测
- 密码哈希：argon2id

### 4.4 数据库模型（Prisma Schema）

共 15 个模型，PostgreSQL 数据源：

| 领域 | 模型 | 说明 |
|------|------|------|
| **用户系统** | `User` | 邮箱、用户名、密码哈希、角色(USER/ADMIN)、状态(ACTIVE/BANNED) |
| | `Session` | Refresh Token 会话，支持轮换/撤销/重放检测 |
| **游戏目录** | `Game` | slug、标题、状态(DRAFT/PUBLISHED/ARCHIVED)、难度等级(JSON) |
| **挑战记录** | `GameAttempt` | 种子、初始状态、最终状态、操作轨迹、指标、排名值 |
| **排行榜** | `LeaderboardDefinition` | 范围(GLOBAL/DAILY/WEEKLY)、排名指标、策略 |
| | `LeaderboardEntry` | 每用户最佳记录 |
| **生命游戏** | `LifePuzzle` | 网格尺寸、边界规则、初始状态、稳定态、目标区域 |
| | `LifeRegionSubmission` | 区域提交记录 |
| **精准造字** | `CharacterRadical` | 偏旁部首 |
| | `CharacterRoot` | 字根 |
| | `CharacterCombination` | 偏旁+字根→汉字组合表 |
| | `PreciseCharacterPuzzle` | 棋盘配置、解法轮次 |
| | `PreciseCharacterRoundSubmission` | 每轮提交记录 |
| **绝对指令** | `AbsoluteCommandPuzzle` | 谜题元数据 |
| | `AbsoluteCommandPuzzleVersion` | 版本化迷宫布局 + 参考解法 |
| | `AbsoluteCommandLog` | 每条指令日志（含前后快照） |
| **管理后台** | `AdminAuditLog` | 操作审计日志 |

### 4.5 排行榜系统

支持两种录入策略：

- **最佳记录**（默认）：比较主指标 + 多级 tie-breaker，仅在更优时更新
- **统计记录**：追踪最近 10 次完成时间的滚动平均值

挑战完成时自动匹配并录入相关排行榜定义。

---

## 5. 前端架构（apps/web & apps/admin）

### 5.1 React 应用初始化

```
main.tsx
  └─ React.StrictMode
      └─ QueryClientProvider        (TanStack Query)
          └─ AuthProvider            (认证引导)
              └─ RouterProvider      (TanStack Router)
                  └─ RootLayout      (全局布局)
                      └─ <Outlet />  (路由页面)
```

### 5.2 路由设计

使用 **TanStack Router** 进行声明式路由管理，支持类型安全的路由参数。

#### 玩家端路由（apps/web）

| 路径 | 页面 | 守卫 |
|------|------|------|
| `/` | 首页 | 无 |
| `/login` | 登录 | PublicOnlyRoute |
| `/register` | 注册 | PublicOnlyRoute |
| `/games` | 游戏列表 | ProtectedRoute |
| `/games/$slug` | 游戏详情 | ProtectedRoute |
| `/games/sliding-puzzle/play` | 华容道游戏 | ProtectedRoute |
| `/games/life-game/play` | 生命游戏 | ProtectedRoute |
| `/games/life-game/practice` | 生命游戏练习室 | ProtectedRoute |
| `/games/precise-character-building/play` | 精准造字 | ProtectedRoute |
| `/games/absolute-command` | 绝对指令谜题列表 | ProtectedRoute |
| `/games/absolute-command/puzzles/$slug` | 谜题详情 | ProtectedRoute |
| `/games/absolute-command/puzzles/$slug/play` | 绝对指令游戏 | ProtectedRoute |
| `/games/$slug/leaderboards` | 排行榜 | ProtectedRoute |

#### 管理端路由（apps/admin）

管理端采用 **Tab 页签导航** 而非 URL 驱动路由，通过 `useTabStore` 管理标签页状态。

| 路由 | 页面 |
|------|------|
| `/login` | 管理员登录 |
| `/` | 管理后台 Shell（Tab 导航） |

内部页面：仪表盘、用户管理、游戏管理、谜题管理、排行榜、挑战记录、审计日志。

### 5.3 状态管理

#### Zustand Store

每个游戏拥有独立的 Zustand Store，管理完整的游戏生命周期：

```
状态机示例（华容道）：
idle → loading → countdown → playing → completed → submitting → submitted
                                                          ↘ abandoned
                                                          ↘ timeout
```

| Store | 职责 |
|-------|------|
| `useAuthStore` | 认证状态、用户信息、Token 管理 |
| `useSlidingPuzzleStore` | 棋盘状态、操作轨迹、倒计时、提交 |
| `useLifeGameStore` | 多区域答案、逐区域提交、提示系统 |
| `usePreciseCharacterStore` | 偏旁池、棋盘、轮次提交、邻接验证 |
| `useAbsoluteCommandStore` | 3D 迷宫状态、指令执行、撤销、动画 |
| `useTabStore`（管理端） | Tab 页签管理 |

#### TanStack Query

用于服务端状态缓存，配置：
- `staleTime`: 5 分钟
- `retry`: 1 次
- `refetchOnWindowFocus`: false

### 5.4 API 通信层

使用原生 `fetch`（无 axios），封装 `apiRequest<T>()` 函数：

```typescript
// 核心特性：
// 1. 自动附加 Authorization: Bearer <token>
// 2. credentials: 'include'（Cookie-based Refresh Token）
// 3. 401 自动重试：调用 refreshApi() 获取新 Token 后重发
// 4. 并发请求去重：共享 refresh Promise，避免多次刷新
```

### 5.5 UI 设计系统

**未使用第三方组件库**，基于 Tailwind CSS 4 构建自定义设计系统：

- CSS 自定义属性（`--sb-` 前缀）
- 三套主题：Light（默认）、Dark、Neon
- 自定义组件：Card、Button、Badge、Input、Tabs、Skeleton、EmptyState、MetricPill、RadarChart
- 游戏通用组件：GamePlayLayout、GameStage、GameHud、GameControlBar、GameResultModal、DifficultySelector

### 5.6 跨标签页同步

使用 `BroadcastChannel` API 在浏览器标签页之间同步认证事件（登录/登出），确保多标签页状态一致。

---

## 6. 共享包架构

### 6.1 @brain-games/shared

**定位：** 前后端契约层

```
packages/shared/src/
├── index.ts              # 统一导出
├── constants.ts          # 游戏 Slug、难度 Key、时长限制
├── types.ts              # 从 Zod Schema 推导的 TypeScript 类型
├── schemas/
│   ├── auth.ts           # 注册/登录/用户 Schema
│   ├── games.ts          # 游戏列表/详情 Schema
│   ├── attempts.ts       # 挑战开始/结束 Schema
│   ├── leaderboards.ts   # 排行榜 Schema
│   ├── life-game.ts      # 生命游戏专用 Schema
│   ├── precise-character-building.ts
│   ├── absolute-command.ts
│   └── absolute-command-admin.ts
└── games/
    ├── common/config.ts  # 通用常量
    ├── sliding-puzzle/config.ts
    ├── life-game/config.ts
    ├── precise-character-building/config.ts
    └── absolute-command/config.ts
```

**核心职责：**
- Zod Schema 定义 API 请求/响应的类型契约
- TypeScript 类型通过 `z.infer<>` 从 Schema 自动推导
- 游戏难度配置（超时时间、棋盘大小等）作为**单一数据源**
- 前后端共享，修改一处即可同步两端

### 6.2 @brain-games/game-engine

**定位：** 纯逻辑游戏引擎（零运行时依赖）

```
packages/game-engine/src/
├── sliding-puzzle/
│   ├── types.ts          # 状态接口
│   ├── engine.ts         # 核心逻辑（移动、判断胜利）
│   ├── generator.ts      # 确定性谜题生成（PRNG）
│   └── validator.ts      # 服务端反作弊验证
├── life-game/
│   ├── types.ts          # 棋盘/区域接口
│   ├── engine.ts         # Conway B3/S23 规则
│   ├── simulation.ts     # 模拟至稳定态/振荡检测
│   ├── regions.ts        # 12 区域划分与坐标转换
│   └── validator.ts      # 细胞集合验证
├── precise-character-building/
│   ├── types.ts          # 偏旁/字根/组合接口
│   ├── engine.ts         # 6x6 网格路径验证
│   └── validator.ts      # 组合查表验证
└── absolute-command/
    ├── types.ts          # 3D 迷宫/单元格类型
    ├── coord.ts          # 3D 坐标工具
    ├── simulator.ts      # 方向执行/撤销/完成检测
    └── validator.ts      # 迷宫结构/参考解法验证
```

**核心职责：**
- 完全解耦于 NestJS、Prisma 等框架
- 服务端导入用于验证客户端提交
- 每个游戏遵循统一模式：`types.ts` → `engine.ts` → `validator.ts`
- 确定性生成器（如华容道）使用种子化 PRNG，保证可重现

---

## 7. 游戏实现架构

每款游戏遵循统一的四层实现模式：

```
┌─────────────────────────────────────────────────────────┐
│                    @brain-games/shared                    │
│  Zod Schema（API 契约）+ 难度配置（单一数据源）            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 @brain-games/game-engine                  │
│  engine.ts（核心逻辑）+ validator.ts（反作弊）             │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    apps/api (NestJS)                      │
│  GameAdapter + Controller + Prisma 持久化                 │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    apps/web (React)                       │
│  Zustand Store + 游戏组件 + TanStack Router 路由           │
└─────────────────────────────────────────────────────────┘
```

### 7.1 已实现游戏

| 游戏 | 类型 | 核心机制 | 3D 渲染 |
|------|------|----------|---------|
| **华容道** (sliding-puzzle) | 数字滑块 | N×N 拼图，操作轨迹重放验证 | 否 |
| **生命游戏** (life-game) | 区域预测 | Conway B3/S23 模拟，多区域提交 | 否 |
| **精准造字** (precise-character-building) | 汉字组合 | 偏旁+字根，6×6 棋盘，邻接约束 | 否 |
| **绝对指令** (absolute-command) | 3D 迷宫 | 方向指令滑行，NUMBER 单元格机制 | Three.js |

### 7.2 典型游戏流程

```
1. 客户端 → POST /attempts/start { difficultyKey }
2. 服务端生成 seed，调用 game-engine 生成 initialState
3. 服务端返回 { attemptId, seed, initialState, maxDurationMs }
4. 客户端本地游戏，积累操作轨迹
5. 客户端 → POST /attempts/:id/finish { finalState, moveTrace }
6. 服务端使用 game-engine 验证器重放/校验
7. 通过 shared Schema 返回结果
```

---

## 8. 基础设施

### 8.1 Docker Compose

```yaml
services:
  postgres:   # PostgreSQL 16, 端口 5432, 数据库 brain_games
  redis:      # Redis 7, 端口 6379
```

### 8.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | — |
| `REDIS_URL` | Redis 连接字符串 | — |
| `JWT_ACCESS_SECRET` | JWT 签名密钥（>= 16 字符） | — |
| `JWT_ACCESS_TTL` | Access Token 有效期 | 15m |
| `JWT_REFRESH_TTL_DAYS` | Refresh Token 有效期 | 30 天 |
| `WEB_ORIGIN` | CORS 允许源 | http://localhost:5173 |
| `API_PORT` | API 服务端口 | 3000 |

环境变量在 `apps/api/src/config/env.ts` 中使用 Zod 进行启动时校验。

### 8.3 开发启动

```bash
./start.sh   # Docker 启动 → Prisma 迁移 → 构建共享包 → 启动 dev 服务
./stop.sh    # 停止端口 → Docker 关闭
```

---

## 9. 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 游戏逻辑位置 | 独立 `game-engine` 包 | 零框架耦合，可独立测试，服务端权威验证 |
| API 契约 | Zod Schema 共享 | 类型安全，前后端一致校验，自动推导 TS 类型 |
| 状态管理 | Zustand + TanStack Query | 轻量客户端状态 + 服务端缓存分离 |
| 认证方案 | JWT + Session 轮换 | 无状态验证 + 有状态撤销 + 重放检测 |
| 3D 渲染 | Three.js + R3F | React 声明式 3D，仅绝对指令使用 |
| UI 组件 | 自定义设计系统 | 无第三方依赖，完全可控的主题系统 |
| 后台路由 | Tab 页签导航 | 管理端高频切换场景，避免页面重载 |
