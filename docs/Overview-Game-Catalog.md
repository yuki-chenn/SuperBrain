# SuperBrain 游戏目录与题库（Game Catalog & Puzzles）

> **状态**：Change 4 `unify-puzzle-and-game-config` 已完成。Game / RuleSet / Difficulty / ContentPolicy / ChallengePolicy 全部走版本化模型；Puzzle/PuzzleVersion 通用化。
> **真理源**：`apps/api/src/admin/admin-games.{controller,service}.ts`、`admin-puzzles.{controller,service}.ts`，`packages/shared/src/games/<game>/content-schema.ts`，`packages/game-engine/src/<game>/content-validator.ts`。

---

## 1. 目录模型

```
Game (slug 唯一)
 ├── GameRuleSetVersion (v1, v2, ...)        ←单条 ACTIVE per game
 ├── GameDifficulty (key + version)          ←单条 ACTIVE per (gameId, key)
 ├── GameContentPolicy                       ←单条 ACTIVE per (gameId, mode, difficultyId) NULLS NOT DISTINCT
 ├── GameChallengePolicy                     ←单条 ACTIVE per (gameId, mode, difficultyId) NULLS NOT DISTINCT
 └── Puzzle (slug 唯一 per game)
      └── PuzzleVersion (v1, v2, ...)        ←单条 PUBLISHED per puzzle
```

DB 部分唯一索引保证“ACTIVE 唯一性”：
- `uq_active_game_ruleset_version`
- `uq_active_game_difficulty`
- `uq_active_game_content_policy`
- `uq_active_game_challenge_policy`
- `uq_published_puzzle_version`

## 2. 端点

### 2.1 游戏元信息

| 方法 | 路径 | 权限 |
|---|---|---|
| `GET` | `/api/admin/games` | `game:read` |
| `GET` | `/api/admin/games/:id` | `game:read` |
| `PATCH` | `/api/admin/games/:id` | `game:update` |
| `POST` | `/api/admin/games/:id/publish` | `game:publish` |
| `POST` | `/api/admin/games/:id/archive` | `game:archive` |

### 2.2 版本化配置

| 方法 | 路径 | 权限 |
|---|---|---|
| `POST` | `/api/admin/games/:gameId/rule-sets` | `game-config:create` |
| `POST` | `/api/admin/games/rule-sets/:rsvId/activate` | `game-config:activate` |
| `POST` | `/api/admin/games/:gameId/difficulties` | `game-config:create` |
| `POST` | `/api/admin/games/difficulties/:diffId/activate` | `game-config:activate` |
| `POST` | `/api/admin/games/:gameId/content-policies` | `game-config:create` |
| `POST` | `/api/admin/games/content-policies/:id/activate` | `game-config:activate` |
| `POST` | `/api/admin/games/:gameId/challenge-policies` | `game-config:create` |
| `POST` | `/api/admin/games/challenge-policies/:id/activate` | `game-config:activate` |

激活操作使用 `prisma.$transaction`：先 `INACTIVE` 现 ACTIVE 行，再 `ACTIVE` 目标行；若违反部分唯一索引会回滚。

**规则**：编辑难度/规则集 ⇒ 不允许 mutate ACTIVE 行，必须创建一个新的 version + activate。

### 2.3 通用 Puzzle / PuzzleVersion

| 方法 | 路径 | 权限 |
|---|---|---|
| `GET` | `/api/admin/puzzles?gameId=&status=&page=&pageSize=` | `puzzle:read` |
| `GET` | `/api/admin/puzzles/:id` | `puzzle:read` |
| `POST` | `/api/admin/puzzles` | `puzzle:create` |
| `PATCH` | `/api/admin/puzzles/:id` | `puzzle:update` |
| `DELETE` | `/api/admin/puzzles/:id` | `puzzle:delete` |
| `POST` | `/api/admin/puzzles/:puzzleId/versions` | `puzzle-version:create` |
| `PATCH` | `/api/admin/puzzles/versions/:vid` | `puzzle-version:create` |
| `POST` | `/api/admin/puzzles/versions/:vid/validate` | `puzzle-version:create` |
| `POST` | `/api/admin/puzzles/versions/:vid/publish` | `puzzle-version:publish` |

`POST .../versions/:vid/validate` 调用引擎的 `validateContent(content)`，写 `validationStatus` 与 `validationReport`。  
`POST .../versions/:vid/publish` 仅 `validationStatus='VALID'` 时允许；事务内 `ARCHIVE` 旧 `PUBLISHED`，set 目标 `PUBLISHED`，更新 `Puzzle.currentVersionId`。

## 3. 内容 JSON 契约

每个 engine 的 `PuzzleVersion.content` 形状定义在 `packages/shared/src/games/<game>/content-schema.ts`：

```ts
import { LifeGameContentSchema } from '@brain-games/shared';
LifeGameContentSchema.parse(version.content); // typed!
```

校验函数定义在 `packages/game-engine/src/<game>/content-validator.ts`，导出 `validateContent(content) → { valid, errors? }`。前端编辑器 + 后端 validate 端点共用同一函数。

| Engine | content 形状概要 |
|---|---|
| `sliding-puzzle` | `{ size, scrambleMoves }`（GENERATED 模式无需手编） |
| `life-game` | `{ width, height, boundary, initialState, stableState, targetRegionIds, targetAnswers, stableGeneration }` |
| `precise-character-building` | `{ boardSize, radicalPool, cells, solutionRounds, runtimeConfig }` |
| `absolute-command` | `{ size, startCoord, cells, optimalCommandCount, season?, episode? }` |

## 4. 版本生命周期

```
DRAFT ─validate→ VALID ─publish→ PUBLISHED ─publish another→ ARCHIVED
                  │                ▲
                  └─ INVALID       └─ 仅一条 PUBLISHED 同时存在 (uq_published_puzzle_version)
```

`PuzzleVersion.status` 枚举：`DRAFT, VALIDATING, VALID, INVALID, PUBLISHED, ARCHIVED`。
`GameRuleSetVersion / GameDifficulty / GameContentPolicy / GameChallengePolicy.status`：`DRAFT, ACTIVE, INACTIVE, ARCHIVED`。

## 5. 引入新游戏的步骤（Checklist）

详细规则参见 `docs/rules/rule-add-new-game.md`（Change 7 落地）。简化路径：

```
1. packages/game-engine/src/<game>/        # 引擎实现 + content-validator.ts
2. packages/shared/src/games/<game>/       # content-schema.ts + difficulty-schema.ts
3. apps/api/src/games/<game>/              # GameRuntimeAdapter 实现 + module
4. apps/api/prisma/seed/games.ts           # 在 GAMES 数组追加一项
5. apps/api/prisma/seed/puzzles-curated.ts # 必要时追加 seed 题
6. （可选）apps/admin/src/features/puzzles/<game>/ # 内容编辑器 React 组件
7. （可选）apps/admin/src/features/catalog/        # 难度/策略编辑器
```

数据库无需新表。

## 6. 限制 / 待补

- 当前实现 **没有** SPA 端的题目内容编辑器 UI（life region 编辑器 / PCB 棋盘编辑器 / 3D 迷宫编辑器）；管理员需通过 API/cuvi 直接 PATCH `PuzzleVersion.content` JSON。content 编辑器组件以及 `PuzzleSchedule / PuzzleTag / PuzzleAsset` 端点的 admin UI 在后续迭代中补齐（design.md §1 列为 Goals，但 Change 4 当前批次先把后端契约与权限通跑）。
- 资源上传（`PuzzleAsset` 文件存储）暂未实现 — 依赖于上层 IT 决策（本地盘 vs S3）。
- `PuzzleSchedule` 重叠检测尚未实现，需要业务上线日榜/周榜前补齐。
- Admin SPA 仍使用旧 `games`、`puzzles`、`game-detail` 路由及 ts-nocheck 兼容层；新版编辑器路由 `/catalog/...`、`/puzzles/$id/versions/$vid/edit` 是后续 UI 工作的入口，不在本批 deliverables 中。

## 7. 与其他 Overview 的关系

- 数据模型详见 `Overview-Database.md`。
- Attempts 如何读取这些版本字段，见 `Overview-Challenge-Runtime.md` §4。
- 排行榜定义 (LeaderboardDefinition) 的 admin 编辑见 `Overview-Leaderboard.md`。
