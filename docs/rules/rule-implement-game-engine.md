# rule: 实现游戏引擎包（packages/game-engine）

新游戏需要一个独立的纯逻辑包，处理生成（GENERATED）、模拟、最终验证、内容验证。

## 目录约定

```
packages/game-engine/src/<game>/
├── index.ts               # 公共导出（命名空间统一）
├── types.ts               # 引擎本地的 TS 类型
├── generator.ts           # GENERATED：函数 generate(seed, config) → InitialState
├── engine.ts              # 可选：模拟器、回放等纯函数
├── validator.ts           # 必备：finishAttempt 用的最终验证
└── content-validator.ts   # 必备：admin 提交 PuzzleVersion 时校验 content JSON
```

## 必须导出的函数

```ts
// validator.ts
export function validate<Game>Attempt(input: {
  initialState: ...;
  finalState: ...;
  ...任何回放需要的字段；
}): { valid: boolean; reason?: string; metrics?: Record<string, unknown> };

// content-validator.ts
export function validateContent(content: unknown):
  { valid: boolean; errors?: string[]; warnings?: string[] };
```

`validateContent` 同时给 admin SPA preflight 和 `POST /api/admin/puzzles/versions/:vid/validate` 端点共用。

## 命名出口（packages/game-engine/src/index.ts）

```ts
export * from './<game>/index.js';
```

并在 `<game>/index.ts` 用前缀重导出，例如：
```ts
export { validateContent as <newgame>ValidateContent } from './content-validator.js';
```

后端 admin-puzzles.service.ts 的 VALIDATORS 表会注册它。

## 测试约定

```
packages/game-engine/src/<game>/__tests__/
├── generator.test.ts
├── validator.test.ts
└── content-validator.test.ts
```

至少覆盖：
- generator 输出的 initialState 通过 validateContent。
- validator 在合法回放下返回 `valid: true`，metrics 中含 `moves` / `commandCount` / 之类。
- 越界、重复、不一致输入返回明确的 `reason`。

## 纯函数原则

- 不读环境变量，不读 DB，不读时间（接受 `now` 参数）。
- 不引用 `@brain-games/shared`（避免引擎 → shared → engine 的循环）。
- 类型可以来自 `@brain-games/shared`，但**仅作为类型导入**：`import type { ... } from '@brain-games/shared'`。

## seed 时调用

GENERATED 游戏的 generator 在 `apps/api/prisma/seed/puzzles-curated.ts` 不会被 seed 直接调用（题库由运行时生成）；CURATED 游戏的 generator（如 life-puzzle-generator.ts、pcb-puzzle-generator.ts）调用引擎的 generator/simulator 产出 PuzzleVersion.content。
