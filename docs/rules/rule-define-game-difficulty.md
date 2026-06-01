# rule: 定义 GameDifficulty

`GameDifficulty` 控制单个游戏在某个难度档位下的运行参数（棋盘尺寸、扰动步数、目标区域数量等）。

## 字段（Prisma 真理源 → `apps/api/prisma/schema.prisma`）

| 字段 | 必填 | 说明 |
|---|:-:|---|
| `gameId` | ✓ | FK Game |
| `key` | ✓ | 业务键，如 `easy / normal / hard / standard` |
| `version` | ✓ | 版本号；同 key 多版本，**编辑必须新建版本而不是 mutate** |
| `label` | ✓ | 显示名 |
| `sortOrder` | | UI 排序 |
| `maxDurationMs` | | 该难度的挑战时长上限；`/start` 时写入 attempt 的 `expiresAt` |
| `config` | | engine-specific JSON（例：`{ size: 4, scrambleMoves: 160 }`） |
| `configHash` | ✓ | `sha256(JSON(config))`；admin service 自动算 |
| `status` | ✓ | `DRAFT / ACTIVE / INACTIVE / ARCHIVED` |

## 不变量

- `uq_active_game_difficulty`：`(gameId, key)` 同时只能有 1 条 ACTIVE。
- 编辑 ACTIVE 行：`POST /api/admin/games/:gameId/difficulties` 创建 v+1，再 `POST .../difficulties/:diffId/activate` 激活；事务内自动把 v 设为 INACTIVE。
- 进行中的 attempt 锁定它绑定的 `(difficultyId, difficultyVersion)`，旧版本永不失效。

## Zod 约束（前端 + admin SPA）

放 `packages/shared/src/games/<game>/difficulty-schema.ts`：

```ts
import { z } from 'zod';
export const SlidingPuzzleDifficultyConfigSchema = z.object({
  size: z.number().int().min(3).max(10),
  scrambleMoves: z.number().int().min(0),
});
```

后端 `AdminGamesService.createDifficulty` 不强校验形状（接受 `Json`），但建议在 admin SPA 提交前用 schema 解析。

## Seed 模板

```ts
difficulties: [
  { key: 'easy', label: '入门', sortOrder: 10, maxDurationMs: 15 * 60_000,
    config: { ...engine-specific... } },
  { key: 'normal', label: '标准', sortOrder: 20, maxDurationMs: 20 * 60_000,
    config: { ...engine-specific..., recommended: true } },
  { key: 'hard', label: '挑战', sortOrder: 30, maxDurationMs: 30 * 60_000,
    config: { ...engine-specific... } },
],
```

## 端点速查

| 操作 | 方法 | 路径 | 权限 |
|---|---|---|---|
| 列 | `GET` | `/api/admin/games/:gameId` 中的 difficulties | `game-config:read` |
| 新增（自动 v+1） | `POST` | `/api/admin/games/:gameId/difficulties` | `game-config:create` |
| 激活 | `POST` | `/api/admin/games/difficulties/:diffId/activate` | `game-config:activate` |
