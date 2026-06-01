# rule: 新增游戏完整 checklist

> 目标：在 SuperBrain 平台增加一款新游戏（slug = `<new-game>`）。**整个过程不需要修改 Schema，不需要新增 HTTP endpoint。** 完成下面 7 步即可。

## 0. 前置条件

- 已读 `Overview-Database.md` / `Overview-Game-Catalog.md` / `Overview-Challenge-Runtime.md`。
- 决定游戏的 `engineKey`（建议与 slug 同名）。
- 决定 `contentMode`：`GENERATED`（运行时生成题）或 `CURATED`（题库手编）。

## 1. 引擎包

```
packages/game-engine/src/<new-game>/
├── index.ts               # 导出 generate / simulate / validate / validateContent
├── types.ts
├── generator.ts           # 仅 GENERATED 需要
├── validator.ts           # 服务端权威验证
└── content-validator.ts   # 必备：rule-implement-game-engine.md
```

详见 `rule-implement-game-engine.md`。

## 2. Shared 包：Zod schemas

```
packages/shared/src/games/<new-game>/
├── content-schema.ts        # PuzzleVersion.content 形状
└── difficulty-schema.ts     # GameDifficulty.config 形状（可选）
```

在 `packages/shared/src/index.ts` 导出。详见 `rule-define-puzzle-content.md`。

## 3. 后端 GameRuntimeAdapter

```
apps/api/src/games/<new-game>/
├── <new-game>.adapter.ts   # 实现 GameRuntimeAdapter
└── <new-game>.module.ts    # 注册 adapter + import PrismaModule
```

详见 `rule-implement-runtime-adapter.md`。

把模块 import 进 `apps/api/src/games/games.module.ts` 的 `imports` 列表。

## 4. Seed 配置

编辑 `apps/api/prisma/seed/games.ts` 的 `GAMES` 数组追加：

```ts
{
  slug: '<new-game>',
  title: '游戏中文名',
  ...,
  ruleSet: { name, engineKey: '<new-game>', engineVersion: '1.0.0', config: {...} },
  difficulties: [
    { key: 'easy', label: '入门', sortOrder: 10, maxDurationMs: ..., config: {...} },
    ...
  ],
  contentPolicy: { contentMode: 'GENERATED' | 'CURATED', generatorKey?: '...' },
}
```

详见 `rule-define-game-difficulty.md` + `rule-define-game-policy.md`。

CURATED 游戏还需要在 `apps/api/prisma/seed/puzzles-curated.ts` 添加题目种子（或留空，由后台编辑器后续录入）。

## 5. 排行榜定义

编辑 `apps/api/prisma/seed/leaderboards.ts` 的 `BASE_LEADERBOARDS[<new-game>]`，至少为每个难度配一个榜。详见 `rule-define-leaderboard.md`。

## 6. 跑 seed

```bash
pnpm --filter api exec prisma db seed
```

`upsert` 幂等；新增 game/leaderboard 行会插入，已存在的不变。

## 7. （可选）前端适配 + admin 内容编辑器

- 前端：在 `apps/web/src/challenge/adapters/<new-game>.adapter.ts` 添加客户端 adapter（render config + buildSubmissionPayload），并在 `apps/web/src/challenge/adapters/registry.ts` 注册。
- Admin 内容编辑器（CURATED 游戏）：`apps/admin/src/features/puzzles/<new-game>/<game>-content-editor.tsx`，符合 `PuzzleContentEditorProps` 接口。

## 验收清单

- [ ] `pnpm --filter api exec prisma db seed` 无错误。
- [ ] `GET /api/games` 返回新 game。
- [ ] `POST /api/challenges/start { gameSlug: '<new-game>', mode: 'RANKED', difficultyKey: 'easy' }` 创建 attempt 成功。
- [ ] `POST /api/challenges/:id/finish` 流程跑通，写入 ScoreRecord + LeaderboardBest。
- [ ] CURATED 游戏：能通过 `POST /api/admin/puzzles/:id/versions` 添加新题目，validate → publish 整个流转通畅。

## 不需要做的事

❌ 不需要新建 Prisma 模型 / 表  
❌ 不需要写 `/api/<new-game>/...` 专属端点  
❌ 不需要修改 `ChallengesController` / `SubmissionsController`  
❌ 不需要改 admin 用户管理 / RBAC / 排行榜读路径
