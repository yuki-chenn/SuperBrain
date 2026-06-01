# rule: 定义 PuzzleVersion.content 形状

CURATED / SCHEDULED 游戏的题库内容存在 `PuzzleVersion.content: Json`。每个引擎需要：一份 Zod schema（在 shared 包）+ 一个 validateContent 实现（在 engine 包）。

## Zod 模板

`packages/shared/src/games/<game>/content-schema.ts`：

```ts
import { z } from 'zod';

export const <Game>ContentSchema = z.object({
  engine: z.literal('<game>').optional(),
  schemaVersion: z.number().int().positive().default(1),
  // ↓↓ 引擎专属字段 ↓↓
  ...,
});
export type <Game>Content = z.infer<typeof <Game>ContentSchema>;
```

在 `packages/shared/src/index.ts` 加 `export * from './games/<game>/content-schema.js';`。

## validateContent 模板

`packages/game-engine/src/<game>/content-validator.ts`：

```ts
export function validateContent(content: unknown):
  { valid: boolean; errors?: string[]; warnings?: string[] } {
  const c = content as any;
  const errors: string[] = [];
  if (!c) return { valid: false, errors: ['no-content'] };
  // 业务校验：引用关系、cell 索引在范围内、solution 与 board 一致 …
  return errors.length ? { valid: false, errors } : { valid: true };
}
```

并在 `packages/game-engine/src/<game>/index.ts` 用前缀重导出：

```ts
export { validateContent as <newgame>ValidateContent } from './content-validator.js';
```

后端 `apps/api/src/admin/admin-puzzles.service.ts` 的 `VALIDATORS` 表会注册它。

## 现有 4 个游戏的 content shape 摘要

| Engine | content 主要字段 |
|---|---|
| `sliding-puzzle` | `{ size, scrambleMoves }` （GENERATED 模式无需手编） |
| `life-game` | `{ width, height, boundary, initialState{aliveCells}, stableState{aliveCells}, targetRegionIds[], targetAnswers[], stableGeneration }` |
| `precise-character-building` | `{ boardSize, radicalPool[], cells[], solutionRounds[], runtimeConfig }` |
| `absolute-command` | `{ size{w,h,d}, startCoord, cells[], optimalCommandCount?, season?, episode? }` |

## 写入约束

- `contentHash = sha256(JSON.stringify(content))` 由 `AdminPuzzlesService.createVersion` 自动算入。
- 同 `puzzleId` 的 `contentHash` 唯一（DB 约束 `@@unique([puzzleId, contentHash])`）。
- `version` 自动 `max+1`。

## 题库读取（运行时）

`<Game>Adapter.startAttempt`：

```ts
const content = puzzleVersion.content as <Game>Content;
return {
  initialState: content,  // 或 only fields the client needs
  contentResolvedType: 'CURATED',
  puzzleId: puzzleVersion.puzzleId,
  puzzleVersionId: puzzleVersion.id,
  ...
};
```

不要在 `startAttempt` 里再算 contentHash —— 它已存在 PuzzleVersion 行上。

## Schema 演进

- 字段新增：直接加 Zod 字段 + 默认值；旧版 content 仍能解析。
- 字段语义变更：bump `schemaVersion`；旧 PuzzleVersion 行保留 v1，新 PuzzleVersion 行写 v2；adapter 按 `content.schemaVersion` 分支。
- 字段删除：先把所有 PuzzleVersion 迁移再 release。
