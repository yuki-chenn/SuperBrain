# SuperBrain 新增游戏需求设计文档：《绝对指令》

> 游戏来源：最强大脑第十三季第二期  
> 游戏类型：三维路径规划 / 指令推演 / 空间记忆 / 状态约束搜索  
> 目标：在现有 SuperBrain 多游戏平台中新增《绝对指令》，支持人工题库、3D 迷宫展示、方向指令输入、动态数字格状态变化、撤回、重置、题目级排行榜和后续管理员题库扩展。

---

## 1. 游戏概述

《绝对指令》是一个三维多层迷宫推理游戏。玩家收到一个尺寸为：

```txt
8 × 8 × 3
```

的三维迷宫，共 3 层，每层为 8×8 的方格阵列。玩家从起点出发，每次输入一个方向指令，角色会沿该方向持续移动，直到遇到停止条件。

迷宫内存在特殊方格：

1. 普通方格：可以经过，可重复经过。
2. 数字方格：每经过一次，数字剩余次数减一；当经过次数达到标示数字时，该数字方格变为红色。
3. 黄色方格：单次移动过程中，进入黄色方格后立即停止。
4. 红色方格：不可进入；单次移动过程中如果前方遇到红色方格，则停在红色方格前一格。
5. 起点方格：玩家初始位置。

玩家目标：

```txt
经过迷宫内所有可经过方格
```

全部方格被经过后挑战完成。成绩记录：

```txt
1. 完成步数
2. 完成用时
```

排行榜规则：

```txt
步数越少排名越高；
步数相同，用时越短排名越高。
```

---

## 2. 设计原则

本游戏必须遵守以下原则：

1. 题目不是随机生成，全部来自人工设置题库。
2. 每个题目有独立排行榜。
3. 题目数据必须保存在数据库中。
4. 需要为后续管理员配置题库预留模型和接口。
5. 前端可以本地模拟移动以保证操作流畅，但后端必须作为权威判定。
6. 每一次有效方向指令都应被服务端记录。
7. 撤回和重置不产生正式成绩，但需要清晰记录 attempt 状态。
8. UI 整体风格与 SuperBrain 现有页面系统保持一致。
9. 特殊的 3D 迷宫展示和操作方式需要单独设计。
10. 题目发布后不能直接破坏已有排行榜，应通过版本机制管理题目变更。

---

## 3. 规则解释与可执行定义

节目规则描述存在若干自然语言歧义。为了让网页版本可实现、可测试、可维护，本设计采用以下确定性规则。

### 3.1 坐标系

迷宫坐标定义：

```txt
x: 0 - 7，从左到右
y: 0 - 7，从前到后
z: 0 - 2，从下到上
```

坐标结构：

```ts
interface MazeCoord {
  x: number;
  y: number;
  z: number;
}
```

坐标方向：

| 指令 | 含义 | 坐标变化 |
|---|---|---|
| `X_POS` | 向右 | `x + 1` |
| `X_NEG` | 向左 | `x - 1` |
| `Y_POS` | 向后 | `y + 1` |
| `Y_NEG` | 向前 | `y - 1` |
| `Z_POS` | 向上层 | `z + 1` |
| `Z_NEG` | 向下层 | `z - 1` |

方向指令是绝对方向，不随摄像机角度变化。

---

### 3.2 有效方格范围

默认全部 8×8×3 共 192 个坐标均为迷宫方格。

```txt
totalCells = 8 * 8 * 3 = 192
```

后续为了支持复杂题库，可扩展 `disabled` 方格：

```txt
disabled 方格不属于迷宫，不需要经过，也不可进入
```

MVP 中可以保留 `disabled` 字段，但默认不使用。

---

### 3.3 步数定义

本游戏排行榜中的“步数”定义为：

```txt
玩家输入的有效方向指令次数
```

不是移动经过的格子数量。

例如：

```txt
输入 X_POS，角色连续移动 5 格后停止
```

则：

```txt
commandCount += 1
travelDistance += 5
```

排行榜使用：

```txt
commandCount
```

辅助展示可以显示：

```txt
travelDistance
```

如果某个方向被红色方格、边界或禁用方格立即阻挡，导致角色没有移动，则该指令为无效指令：

```txt
不增加 commandCount
不写入正式 commandHistory
可以记录 invalidCommandCount 用于审计，但不参与排行榜
```

---

### 3.4 起点规则

起点在挑战开始时即视为已经过：

```txt
visitedCells.add(startCoord)
```

如果起点是数字方格，MVP 不消费数字次数。题库校验器应禁止起点同时为数字方格、黄色方格或红色方格，避免规则歧义。

---

### 3.5 持续移动规则

玩家输入一个方向后，角色沿该方向逐格移动，直到触发停止条件。

单次移动流程：

```txt
当前位置 current
输入方向 direction
while true:
  next = current + direction

  if next 越界:
      停在 current
      本次移动结束

  if next 是 disabled:
      停在 current
      本次移动结束

  if next 是 red:
      停在 current
      本次移动结束

  进入 next
  标记 next 已经过
  如果 next 是数字方格:
      处理数字次数

  if next 是 yellow:
      停在 next
      本次移动结束

  current = next
```

注意：

1. 黄色方格是可进入方格。
2. 红色方格是不可进入方格。
3. 边界不是方格，不能进入。
4. 数字方格在进入后处理次数。
5. 数字方格变红不影响本次已经进入该格的事实。

---

### 3.6 数字方格规则

数字方格有一个初始标示数字：

```ts
requiredPasses: number
```

同时运行时维护：

```ts
remainingPasses: number
```

每次角色进入该数字方格：

```txt
remainingPasses -= 1
```

当：

```txt
remainingPasses === 0
```

该数字方格转为红色。

#### 关键规则

数字方格在本次进入时归零后：

```txt
该格立即标记为 red
但本次移动不因“当前格变红”回退
```

也就是说：

1. 玩家可以进入这个格子，并且该格计入已经过。
2. 如果本次移动后续还要继续，角色可以从该格继续向前离开。
3. 一旦角色离开该格，后续指令不能再次进入该格。
4. 如果数字格归零后，本次移动因为边界、黄色、红色等条件最终停在该格，则玩家允许暂时站在红色格上。
5. 玩家下一次输入方向时可以从该红色格离开。
6. 之后不能再从其他路径进入该红色格。

为避免“站在红色格上”的复杂体验，题库设计时应尽量保证数字格归零后角色不会停留其上。但引擎必须支持这种情况。

---

### 3.7 黄色方格规则

黄色方格是停止方格：

```txt
进入黄色方格后，本次移动立即停止
```

黄色方格可以重复经过。每次进入都会停止。

黄色方格不能同时是数字方格或红色方格。MVP 题库校验器应禁止复合类型。

---

### 3.8 红色方格规则

红色方格是阻挡方格：

```txt
遇见红色方格时，角色停在红色方格前一格
```

红色方格分两类：

1. 初始红色方格：题目一开始就是 red。
2. 动态红色方格：数字方格剩余次数归零后变成 red。

红色方格不允许进入，除非是数字方格在角色当前进入后刚刚转为红色的特殊情况。

---

### 3.9 完成条件

挑战完成条件：

```txt
所有 active cell 均已被 visited
```

active cell 包括：

1. 普通方格。
2. 黄色方格。
3. 数字方格。
4. 起点方格。

MVP 定义：

```txt
初始红色方格不属于需要经过的 active cell；
动态转红方格在变红前如果已经经过，则已满足 visited。
```

即：

```ts
requiredVisitCells = allCells - disabledCells - initialRedCells
```

完成判断：

```ts
requiredVisitCells.every(cell => visitedCells.has(cell))
```

---

## 4. 难度与题目选择

本游戏不按固定难度分榜，而是按题目独立排名。

玩家可以从题库中选择任意题目进行挑战：

```txt
/games/absolute-command
  ↓
题目列表
  ↓
选择题目
  ↓
进入题目详情
  ↓
开始挑战
```

每个题目可以拥有自己的难度标签：

```txt
入门
标准
困难
专家
```

但难度只用于筛选和展示，不影响排行榜分组。

题目字段示例：

```ts
interface AbsoluteCommandPuzzleMeta {
  id: string;
  slug: string;
  title: string;
  difficultyLabel: "入门" | "标准" | "困难" | "专家";
  estimatedDuration: string;
  optimalCommandCount?: number;
  author?: string;
  season: 13;
  episode: 2;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
```

---

## 5. 游戏状态模型

### 5.1 静态题目配置

```ts
interface AbsoluteCommandPuzzle {
  id: string;
  slug: string;
  title: string;
  description?: string;

  size: {
    width: 8;
    height: 8;
    depth: 3;
  };

  startCoord: MazeCoord;

  cells: AbsoluteCommandCell[];

  referenceSolution?: AbsoluteCommandDirection[];

  metadata: {
    difficultyLabel?: string;
    estimatedDuration?: string;
    optimalCommandCount?: number;
    source?: string;
    author?: string;
    notes?: string;
  };

  version: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
```

### 5.2 方格配置

```ts
type AbsoluteCommandCellType =
  | "NORMAL"
  | "YELLOW_STOP"
  | "NUMBER"
  | "INITIAL_RED"
  | "DISABLED"
  | "START";

interface AbsoluteCommandCell {
  coord: MazeCoord;
  type: AbsoluteCommandCellType;

  // type === NUMBER 时必填
  requiredPasses?: number;

  // 可选展示标签，例如数字格显示 "3"
  label?: string;

  // 可选备注，仅管理员可见
  adminNote?: string;
}
```

约束：

1. 每个坐标最多一个 cell 配置。
2. 未配置坐标默认视为 `NORMAL`。
3. 必须有且只有一个 `START`。
4. `NUMBER.requiredPasses` 必须为正整数。
5. `YELLOW_STOP`、`NUMBER`、`INITIAL_RED`、`START` 互斥。
6. `DISABLED` 不可与其他类型重叠。
7. 起点不能是 `INITIAL_RED`、`NUMBER`、`YELLOW_STOP` 或 `DISABLED`。

---

### 5.3 运行时状态

```ts
interface AbsoluteCommandRuntimeState {
  position: MazeCoord;

  visitedCells: MazeCoord[];

  redCells: MazeCoord[];

  numberStates: Array<{
    coord: MazeCoord;
    requiredPasses: number;
    remainingPasses: number;
  }>;

  commandCount: number;

  travelDistance: number;

  commandHistory: AbsoluteCommandHistoryItem[];

  completed: boolean;
}
```

### 5.4 指令历史

用于撤回上一步。

```ts
interface AbsoluteCommandHistoryItem {
  index: number;
  direction: AbsoluteCommandDirection;

  from: MazeCoord;
  to: MazeCoord;

  path: MazeCoord[];

  stopReason:
    | "BOUNDARY"
    | "DISABLED"
    | "RED_BLOCK"
    | "YELLOW_STOP";

  changedNumberCells: Array<{
    coord: MazeCoord;
    beforeRemaining: number;
    afterRemaining: number;
    becameRed: boolean;
  }>;

  snapshotBefore: AbsoluteCommandRuntimeStateSnapshot;
  snapshotAfter: AbsoluteCommandRuntimeStateSnapshot;

  createdAt: string;
}
```

MVP 为简化撤回，可以保存完整 `snapshotBefore` 和 `snapshotAfter`。由于棋盘只有 192 格，快照成本可接受。

---

## 6. 游戏流程

## 6.1 题目列表流程

```txt
进入 /games/absolute-command
  ↓
展示游戏介绍和题目列表
  ↓
按难度 / 状态 / 排行榜热度筛选
  ↓
点击某个题目
  ↓
进入 /games/absolute-command/puzzles/:puzzleSlug
```

题目卡片展示：

1. 题目名称。
2. 难度标签。
3. 最优参考步数，可选。
4. 估计耗时。
5. 当前排行榜第一名。
6. 完成人数。
7. 开始挑战按钮。

---

## 6.2 题目详情流程

```txt
进入题目详情
  ↓
展示 3D 题目预览
  ↓
展示题目规则摘要
  ↓
右侧展示该题排行榜 Top 5
  ↓
点击开始挑战
  ↓
创建 attempt
  ↓
进入游戏页面
```

路径：

```txt
/games/absolute-command/puzzles/:puzzleSlug
```

---

## 6.3 开始挑战流程

```txt
POST /api/games/absolute-command/puzzles/:puzzleId/attempts/start
```

后端行为：

1. 校验用户已登录。
2. 校验 puzzle 已发布。
3. 读取 puzzle 当前发布版本。
4. 创建 attempt。
5. 将 puzzle snapshot 写入 attempt。
6. 初始化 runtime state：
   - position = startCoord
   - visitedCells = [startCoord]
   - numberStates = 所有数字格 requiredPasses
   - redCells = 初始红色格
   - commandCount = 0
   - travelDistance = 0
   - commandHistory = []
   - completed = false
7. 返回 attemptId 和前端渲染所需状态。

为什么保存 puzzle snapshot：

```txt
管理员后续修改题目时，不影响已开始或已完成的 attempt，也不破坏历史排行榜可复现性。
```

---

## 6.4 输入方向指令流程

玩家点击方向按钮或使用键盘输入方向。

```txt
玩家输入 direction
  ↓
前端锁定输入
  ↓
POST /commands
  ↓
后端使用 attempt snapshot 权威模拟
  ↓
返回 path、stopReason、新 runtime state
  ↓
前端播放移动动画并同步状态
  ↓
如果 completed，则弹出结果弹窗
```

API：

```txt
POST /api/games/absolute-command/attempts/:attemptId/commands
```

Request：

```ts
interface ExecuteCommandRequest {
  direction: AbsoluteCommandDirection;
}
```

Response：

```ts
interface ExecuteCommandResponse {
  moved: boolean;

  invalidReason?: "NO_MOVEMENT" | "ATTEMPT_NOT_ACTIVE";

  state: AbsoluteCommandRuntimeStateView;

  commandResult?: {
    direction: AbsoluteCommandDirection;
    from: MazeCoord;
    to: MazeCoord;
    path: MazeCoord[];
    stopReason: "BOUNDARY" | "DISABLED" | "RED_BLOCK" | "YELLOW_STOP";
    commandCount: number;
    travelDistanceDelta: number;
  };

  completed: boolean;

  result?: {
    commandCount: number;
    durationMs: number;
    travelDistance: number;
    rank?: number;
    personalBest: boolean;
  };
}
```

---

## 6.5 撤回流程

用户点击“撤回”。

```txt
POST /api/games/absolute-command/attempts/:attemptId/undo
```

规则：

1. 只能撤回当前 attempt 的上一条有效指令。
2. 如果没有指令历史，返回 `NO_COMMAND_TO_UNDO`。
3. 撤回后：
   - position 恢复。
   - visitedCells 恢复。
   - redCells 恢复。
   - numberStates 恢复。
   - commandCount -1。
   - travelDistance 恢复。
4. 撤回操作不计入排行榜步数。
5. 如果 attempt 已完成，不允许撤回。完成后成绩锁定。

Response：

```ts
interface UndoCommandResponse {
  success: boolean;
  state: AbsoluteCommandRuntimeStateView;
}
```

实现建议：

```txt
使用上一条 commandHistoryItem.snapshotBefore 直接恢复状态。
```

---

## 6.6 重置流程

用户点击“重置”。

```txt
POST /api/games/absolute-command/attempts/:attemptId/reset
```

规则：

1. 清空所有指令历史。
2. 状态恢复到 attempt 初始状态。
3. `startedAt` 不重置。

MVP 推荐：

```txt
重置不重置 startedAt
```

理由：

1. 避免用户通过反复重置保留同一 attempt 但刷新计时。
2. 真正想重新计时应重新开始新 attempt。
3. UI 上“重置”表示重置盘面，不表示重新开局。

同时提供“重新开始”按钮：

```txt
重新开始 = abandon 当前 attempt + 创建新 attempt
```

Response：

```ts
interface ResetAttemptResponse {
  success: true;
  state: AbsoluteCommandRuntimeStateView;
}
```

---

## 6.7 完成流程

每次有效指令执行后，后端检查：

```ts
isCompleted(state, puzzleSnapshot)
```

如果完成：

1. attempt.status = `COMPLETED`
2. completedAt = now
3. durationMs = completedAt - startedAt
4. metrics:
   - commandCount
   - durationMs
   - travelDistance
   - totalVisitedCells
5. 更新该 puzzle 的排行榜。
6. 返回 result。
7. 前端展示结果弹窗。

---

## 7. 核心引擎逻辑

建议在共享引擎中新增：

```txt
packages/game-engine/src/absolute-command/
  types.ts
  coord.ts
  engine.ts
  simulator.ts
  validator.ts
  serializer.ts
  index.ts
```

### 7.1 类型定义

```ts
export type AbsoluteCommandDirection =
  | "X_POS"
  | "X_NEG"
  | "Y_POS"
  | "Y_NEG"
  | "Z_POS"
  | "Z_NEG";

export interface MazeCoord {
  x: number;
  y: number;
  z: number;
}

export interface AbsoluteCommandPuzzleSnapshot {
  puzzleId: string;
  puzzleVersion: number;
  size: {
    width: 8;
    height: 8;
    depth: 3;
  };
  startCoord: MazeCoord;
  cells: AbsoluteCommandCell[];
}
```

---

### 7.2 方向工具

```ts
export function directionToDelta(direction: AbsoluteCommandDirection): MazeCoord {
  switch (direction) {
    case "X_POS": return { x: 1, y: 0, z: 0 };
    case "X_NEG": return { x: -1, y: 0, z: 0 };
    case "Y_POS": return { x: 0, y: 1, z: 0 };
    case "Y_NEG": return { x: 0, y: -1, z: 0 };
    case "Z_POS": return { x: 0, y: 0, z: 1 };
    case "Z_NEG": return { x: 0, y: 0, z: -1 };
  }
}
```

---

### 7.3 单步模拟

```ts
export interface ExecuteDirectionInput {
  puzzle: AbsoluteCommandPuzzleSnapshot;
  state: AbsoluteCommandRuntimeState;
  direction: AbsoluteCommandDirection;
  now: string;
}

export interface ExecuteDirectionResult {
  moved: boolean;
  invalidReason?: "NO_MOVEMENT";

  nextState: AbsoluteCommandRuntimeState;

  historyItem?: AbsoluteCommandHistoryItem;

  completed: boolean;
}

export function executeDirection(
  input: ExecuteDirectionInput,
): ExecuteDirectionResult;
```

伪代码：

```ts
function executeDirection(input) {
  const snapshotBefore = cloneState(input.state);

  let current = input.state.position;
  const delta = directionToDelta(input.direction);
  const path = [];
  const changedNumberCells = [];

  while (true) {
    const next = addCoord(current, delta);

    if (!isInBounds(next, input.puzzle.size)) {
      return finishMove("BOUNDARY");
    }

    if (isDisabledCell(next, input.puzzle)) {
      return finishMove("DISABLED");
    }

    if (isRedCell(next, input.state)) {
      return finishMove("RED_BLOCK");
    }

    current = next;
    path.push(current);
    markVisited(current);

    if (isNumberCell(current, input.puzzle)) {
      const change = consumeNumberCell(current);
      changedNumberCells.push(change);
    }

    if (isYellowStopCell(current, input.puzzle)) {
      return finishMove("YELLOW_STOP");
    }
  }

  function finishMove(stopReason) {
    if (path.length === 0) {
      return {
        moved: false,
        invalidReason: "NO_MOVEMENT",
        nextState: input.state,
        completed: false,
      };
    }

    const nextState = {
      ...state,
      position: current,
      commandCount: state.commandCount + 1,
      travelDistance: state.travelDistance + path.length,
      commandHistory: appendHistory(...)
    };

    const completed = isCompleted(nextState, input.puzzle);

    return {
      moved: true,
      nextState,
      historyItem,
      completed,
    };
  }
}
```

---

## 8. 数据库设计

## 8.1 Puzzle 表

```prisma
model AbsoluteCommandPuzzle {
  id                  String   @id @default(cuid())
  slug                String   @unique
  title               String
  description         String?
  difficultyLabel     String?
  season              Int      @default(13)
  episode             Int      @default(2)
  source              String?
  status              String   @default("DRAFT")
  currentVersionId    String?
  estimatedDuration   String?
  optimalCommandCount Int?
  metadata            Json     @default("{}")
  createdByUserId     String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  versions            AbsoluteCommandPuzzleVersion[]
  attempts            GameAttempt[]

  @@index([status])
  @@index([difficultyLabel])
}
```

---

## 8.2 Puzzle Version 表

```prisma
model AbsoluteCommandPuzzleVersion {
  id                String   @id @default(cuid())
  puzzleId          String
  version           Int
  size              Json
  startCoord        Json
  cells             Json
  referenceSolution Json?
  validationStatus  String   @default("UNVALIDATED")
  validationReport  Json     @default("{}")
  createdByUserId   String?
  createdAt         DateTime @default(now())

  puzzle            AbsoluteCommandPuzzle @relation(fields: [puzzleId], references: [id], onDelete: Cascade)

  @@unique([puzzleId, version])
  @@index([puzzleId])
}
```

版本状态：

```ts
type PuzzleValidationStatus =
  | "UNVALIDATED"
  | "VALID"
  | "INVALID";
```

---

## 8.3 GameAttempt 扩展使用

复用通用 `GameAttempt` 表，增加或使用 `metadata` 字段：

```ts
metadata: {
  puzzleId: string;
  puzzleVersionId: string;
  puzzleVersion: number;
  puzzleSnapshot: AbsoluteCommandPuzzleSnapshot;

  runtimeState: AbsoluteCommandRuntimeState;

  resetCount: number;
  undoCount: number;
  invalidCommandCount: number;
}
```

完成后 metrics：

```ts
metrics: {
  commandCount: number;
  durationMs: number;
  travelDistance: number;
  totalVisitedCells: number;
  requiredVisitCells: number;
  resetCount: number;
  undoCount: number;
}
```

排行榜使用：

```txt
commandCount ASC
durationMs ASC
completedAt ASC
```

---

## 8.4 Command Log 表，可选但推荐

为了审计和回放，建议新增：

```prisma
model AbsoluteCommandLog {
  id             String   @id @default(cuid())
  attemptId      String
  userId         String
  index          Int
  direction      String
  fromCoord      Json
  toCoord        Json
  path           Json
  stopReason     String
  snapshotBefore Json?
  snapshotAfter  Json?
  createdAt      DateTime @default(now())

  attempt        GameAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([attemptId])
  @@unique([attemptId, index])
}
```

MVP 如果不想新增表，也可以将 command history 存在 `GameAttempt.metadata.runtimeState.commandHistory` 中。考虑棋盘小、指令数不会过大，MVP 可以先用 JSON；后续管理员回放和反作弊再迁移到独立表。

---

## 9. 排行榜设计

### 9.1 每题独立排行榜

每个 puzzle 都有独立排行榜：

```txt
absolute-command:<puzzleId>
```

LeaderboardDefinition 示例：

```ts
{
  slug: "absolute-command-puzzle-<puzzleSlug>",
  name: "绝对指令 · <题目名称>",
  gameSlug: "absolute-command",
  scope: "PUZZLE",
  puzzleId: "<puzzleId>",
  rankMetric: "commandCount",
  rankDirection: "ASC",
  tieBreakers: [
    { metric: "durationMs", direction: "ASC" },
    { metric: "completedAt", direction: "ASC" }
  ],
  entryPolicy: "BEST_PER_USER"
}
```

### 9.2 排序规则

```txt
1. commandCount ASC
2. durationMs ASC
3. completedAt ASC
```

解释：

1. 步数最少优先。
2. 步数相同时，用时更短优先。
3. 步数和用时都相同时，更早完成优先。

### 9.3 个人最佳

同一用户同一题目只保留最好成绩。

更好成绩判断：

```txt
commandCount 更小 → 更新
commandCount 相同且 durationMs 更小 → 更新
commandCount 和 durationMs 都相同且 completedAt 更早 → 更新
否则不更新
```

### 9.4 排行榜展示列

```txt
Rank
Player
Steps
Time
Distance
Completed At
```

其中：

```txt
Steps = commandCount
Time = durationMs
Distance = travelDistance，辅助展示，不参与排序
```

---

## 10. 后端 API 设计

统一前缀：

```txt
/api/games/absolute-command
```

---

### 10.1 获取题目列表

```txt
GET /api/games/absolute-command/puzzles
```

Query：

```ts
interface ListAbsoluteCommandPuzzlesQuery {
  difficultyLabel?: string;
  status?: "PUBLISHED";
  page?: number;
  pageSize?: number;
}
```

Response：

```ts
interface ListAbsoluteCommandPuzzlesResponse {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    difficultyLabel?: string;
    estimatedDuration?: string;
    optimalCommandCount?: number;
    completedCount: number;
    bestRecord?: {
      username: string;
      commandCount: number;
      durationMs: number;
    };
  }>;
  total: number;
}
```

---

### 10.2 获取题目详情

```txt
GET /api/games/absolute-command/puzzles/:puzzleSlug
```

Response：

```ts
interface GetAbsoluteCommandPuzzleResponse {
  puzzle: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    difficultyLabel?: string;
    estimatedDuration?: string;
    optimalCommandCount?: number;
    source: string;
    size: {
      width: 8;
      height: 8;
      depth: 3;
    };
    previewCells: AbsoluteCommandCell[];
  };

  leaderboardPreview: {
    items: LeaderboardPreviewItem[];
  };
}
```

注意：

1. 可以返回题目的公开 cell 配置，因为玩家需要观察完整迷宫。
2. 如果后续需要隐藏某些信息，应在 puzzle 版本中增加 visibility 配置。
3. 不返回 referenceSolution。

---

### 10.3 开始挑战

```txt
POST /api/games/absolute-command/puzzles/:puzzleId/attempts/start
```

Response：

```ts
interface StartAbsoluteCommandAttemptResponse {
  attemptId: string;

  puzzle: {
    id: string;
    slug: string;
    title: string;
    version: number;
    size: {
      width: 8;
      height: 8;
      depth: 3;
    };
    startCoord: MazeCoord;
    cells: AbsoluteCommandCell[];
  };

  state: AbsoluteCommandRuntimeStateView;

  startedAt: string;
}
```

---

### 10.4 执行方向指令

```txt
POST /api/games/absolute-command/attempts/:attemptId/commands
```

Request：

```ts
interface ExecuteAbsoluteCommandRequest {
  direction: AbsoluteCommandDirection;
}
```

Response 见第 6.4 节。

---

### 10.5 撤回

```txt
POST /api/games/absolute-command/attempts/:attemptId/undo
```

Response：

```ts
interface UndoAbsoluteCommandResponse {
  success: true;
  state: AbsoluteCommandRuntimeStateView;
}
```

---

### 10.6 重置盘面

```txt
POST /api/games/absolute-command/attempts/:attemptId/reset
```

Response：

```ts
interface ResetAbsoluteCommandResponse {
  success: true;
  state: AbsoluteCommandRuntimeStateView;
}
```

---

### 10.7 获取 Attempt

```txt
GET /api/games/absolute-command/attempts/:attemptId
```

用途：

1. 页面刷新后恢复当前挑战。
2. 继续未完成 attempt。
3. 展示历史完成 attempt。

Response：

```ts
interface GetAbsoluteCommandAttemptResponse {
  attemptId: string;
  status: "STARTED" | "COMPLETED" | "ABANDONED" | "INVALID";
  puzzle: {
    id: string;
    slug: string;
    title: string;
    version: number;
    size: {
      width: 8;
      height: 8;
      depth: 3;
    };
    startCoord: MazeCoord;
    cells: AbsoluteCommandCell[];
  };
  state: AbsoluteCommandRuntimeStateView;
  startedAt: string;
  completedAt?: string;
  metrics?: {
    commandCount: number;
    durationMs: number;
    travelDistance: number;
  };
}
```

---

### 10.8 放弃 Attempt

```txt
POST /api/games/absolute-command/attempts/:attemptId/abandon
```

Response：

```ts
interface AbandonAbsoluteCommandAttemptResponse {
  success: true;
}
```

---

### 10.9 获取题目排行榜

```txt
GET /api/games/absolute-command/puzzles/:puzzleId/leaderboard
```

Query：

```ts
interface GetPuzzleLeaderboardQuery {
  limit?: number;
  offset?: number;
}
```

Response：

```ts
interface GetPuzzleLeaderboardResponse {
  puzzle: {
    id: string;
    title: string;
    slug: string;
  };
  items: Array<{
    rank: number;
    user: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
    commandCount: number;
    durationMs: number;
    travelDistance: number;
    completedAt: string;
  }>;
  myBest?: {
    rank: number;
    commandCount: number;
    durationMs: number;
    travelDistance: number;
    completedAt: string;
  };
}
```

---

## 11. 管理员题库扩展设计

虽然 MVP 可以先通过 seed 写入题目，但数据库和接口必须为管理员题库管理预留。

### 11.1 管理员功能

后续管理员应能：

1. 创建题目。
2. 编辑题目基本信息。
3. 编辑 8×8×3 迷宫。
4. 设置起点。
5. 设置黄色停止格。
6. 设置数字格及其 requiredPasses。
7. 设置初始红色格。
8. 设置禁用格，可选。
9. 填写参考解法。
10. 执行题目校验。
11. 预览题目。
12. 发布题目。
13. 下架题目。
14. 创建新版本。
15. 查看题目排行榜。
16. 查看玩家 attempt 回放。

---

### 11.2 题目校验器

发布前必须执行校验。

校验项：

```txt
基础合法性：
- 尺寸必须为 8×8×3
- 起点唯一
- 坐标不越界
- 每个坐标最多一种特殊类型
- 数字格 requiredPasses 为正整数
- 起点不能是黄色/数字/红色/禁用
- disabled 不计入 requiredVisitCells

可玩性：
- 如果提供 referenceSolution，则执行模拟
- referenceSolution 必须能够完成题目
- 完成时所有 requiredVisitCells 都已 visited
- commandCount 与 optimalCommandCount 一致或自动写入
- 任何一步不得产生非法状态

风险提示：
- 存在不可访问区域
- 数字格归零后玩家停在红格上
- 存在可能造成死局的早期红化路径
- 黄色格过少可能导致移动过长难以控制
```

校验结果结构：

```ts
interface PuzzleValidationReport {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    coord?: MazeCoord;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    coord?: MazeCoord;
  }>;
  referenceSolutionResult?: {
    completed: boolean;
    commandCount: number;
    durationIndependent: true;
    visitedCellCount: number;
    requiredVisitCellCount: number;
  };
}
```

---

### 11.3 版本策略

题目一旦发布并产生排行榜，不允许直接修改当前版本。

修改策略：

```txt
编辑题目
  ↓
创建新 PuzzleVersion
  ↓
校验通过
  ↓
发布新版本
  ↓
新 attempt 使用新版本
```

排行榜策略有两种：

### 方案 A：每个题目只有一个当前排行榜

新版本发布后，旧版本排行榜归档。

代价：

1. 简单。
2. 但历史成绩和新版本可能不可比。

### 方案 B：每个题目版本独立排行榜

```txt
absolute-command:<puzzleId>:v1
absolute-command:<puzzleId>:v2
```

推荐方案 B。

理由：

1. 公平。
2. 可追溯。
3. 管理员调整题目不会污染旧成绩。
4. 适合长期运营。

---

## 12. 前端页面设计

整体页面风格、卡片、详情页、排行榜、按钮、主题系统与现有 SuperBrain 前端规范保持一致。这里仅详细描述《绝对指令》的特殊 UI。

---

## 12.1 页面路由

```txt
/games/absolute-command
  绝对指令游戏首页 + 题目列表

/games/absolute-command/puzzles/:puzzleSlug
  单题详情页

/games/absolute-command/puzzles/:puzzleSlug/play
  3D 游戏挑战页

/games/absolute-command/puzzles/:puzzleSlug/leaderboard
  单题完整排行榜
```

---

## 12.2 题目列表页

展示结构：

```txt
┌──────────────────────────────────────────────┐
│ 绝对指令                                      │
│ 三维路径规划与绝对方向指令挑战                  │
│                                              │
│ [全部] [入门] [标准] [困难] [专家]              │
│                                              │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ │ 题目 001    │ │ 题目 002    │ │ 题目 003    │ │
│ │ 标准        │ │ 困难        │ │ 专家        │ │
│ │ Best 18步   │ │ Best 24步   │ │ Best 31步   │ │
│ └────────────┘ └────────────┘ └────────────┘ │
└──────────────────────────────────────────────┘
```

题目卡片展示：

1. 题目名称。
2. 难度标签。
3. 最优步数。
4. 当前第一名。
5. 完成人数。
6. 估计耗时。
7. 进入按钮。

---

## 12.3 游戏挑战页整体布局

桌面端：

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ TopNav                                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────┐ ┌──────────────────────────────┐ ┌───────────────┐ │
│ │ Game Info          │ │ 3D Maze View                 │ │ Control Panel │ │
│ │                    │ │                              │ │               │ │
│ │ 绝对指令            │ │      8×8×3 Cubes             │ │ Direction Pad │ │
│ │ 题目 001            │ │                              │ │               │ │
│ │ Steps  18           │ │                              │ │ [X-] [X+]     │ │
│ │ Time   02:31        │ │                              │ │ [Y-] [Y+]     │ │
│ │ Visited 158/192     │ │                              │ │ [Z-] [Z+]     │ │
│ │                    │ │                              │ │               │ │
│ │ [撤回] [重置] [退出] │ │                              │ │ Layer MiniMap │ │
│ └────────────────────┘ └──────────────────────────────┘ └───────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

移动端：

```txt
┌──────────────────────────────┐
│ 绝对指令 · 题目 001           │
│ Steps 18  Time 02:31          │
│ Visited 158/192               │
│                              │
│ 3D Maze View                  │
│                              │
│ Direction Pad                 │
│ [X-] [X+] [Y-] [Y+] [Z-] [Z+] │
│                              │
│ [撤回] [重置]                 │
│                              │
│ Layer MiniMap / Rules Tabs    │
└──────────────────────────────┘
```

---

## 12.4 3D 迷宫视图设计

### 12.4.1 技术建议

使用：

```txt
three.js
@react-three/fiber
@react-three/drei
```

原因：

1. React 项目集成自然。
2. 适合渲染 8×8×3 的立方体阵列。
3. 支持 OrbitControls。
4. 支持透明材质、发光边框、文本标签。
5. 后续可扩展路径动画和回放。

---

### 12.4.2 视觉结构

每个方格显示为一个正方体。

三层结构：

```txt
z = 2  上层
z = 1  中层
z = 0  下层
```

为了增强层次感，三层在视觉上可沿 z 轴垂直分离：

```txt
layerSpacing = 1.35
cubeSize = 1
cubeGap = 0.08
```

整体居中显示。

---

### 12.4.3 方块颜色

| 类型 | 颜色 / 材质 | 说明 |
|---|---|---|
| 未访问普通格 | 半透明灰蓝 | 默认迷宫格 |
| 已访问普通格 | 淡蓝 / 青色描边 | 表示已经经过 |
| 当前玩家位置 | 亮绿色实体块或发光球 | 必须非常醒目 |
| 黄色方格 | 黄色实体块 | 进入后停止 |
| 数字方格 | 半透明灰块 + 红色数字标签 | 显示剩余次数 |
| 已归零红色格 | 红色实体块 | 不可进入 |
| 初始红色格 | 红色实体块 | 不可进入 |
| 禁用格 | 不渲染或深色低透明 | 不属于迷宫 |
| 起点 | 绿色边框 / START 标签 | 初始位置 |

推荐颜色：

```css
--ac-cell-normal: rgba(180, 200, 220, 0.28);
--ac-cell-visited: rgba(56, 189, 248, 0.42);
--ac-cell-yellow: #facc15;
--ac-cell-red: #ef4444;
--ac-cell-player: #22c55e;
--ac-cell-number-text: #fb174b;
--ac-cell-edge: rgba(255, 255, 255, 0.25);
```

---

### 12.4.4 数字显示

数字格需要显示当前剩余次数：

```txt
requiredPasses = 3
remainingPasses = 2
显示 "2"
```

显示方式：

1. 使用 3D Text 或 HTML overlay。
2. 数字始终朝向摄像机。
3. 数字颜色使用红色。
4. 字体需要足够粗。
5. 当 remainingPasses 归零，数字隐藏，方块变红。

对于多角度观察，数字可以显示在立方体正面和顶部两面，或者使用 billboard 方式始终面向相机。

---

### 12.4.5 当前路径动画

执行方向指令后，玩家位置沿路径逐格移动。

动画规则：

```txt
每经过一格 80ms - 120ms
超过 8 格时自动压缩总动画时长
最大单次动画不超过 700ms
```

动画过程中：

1. 禁止再次输入方向。
2. 路径格依次点亮为 visited。
3. 数字格经过时数字即时减一。
4. 变红时播放短暂红色闪烁。
5. 停止原因可以用轻提示展示：
   - `Stopped by yellow cell`
   - `Blocked by red cell`
   - `Reached boundary`

---

### 12.4.6 摄像机与视角

默认使用等距视角：

```txt
camera position: [9, 10, 12]
lookAt: center of maze
```

提供视角按钮：

```txt
[等距视角]
[俯视]
[前视]
[侧视]
[分层视图]
```

视角功能：

| 视角 | 用途 |
|---|---|
| 等距视角 | 默认观察整体三维结构 |
| 俯视 | 查看 x-y 平面路径 |
| 前视 | 查看 x-z 层级 |
| 侧视 | 查看 y-z 层级 |
| 分层视图 | 三层 8×8 小地图平铺 |

允许用户旋转视角，但方向指令不随视角变化。

必须在 UI 中提示：

```txt
方向指令为绝对坐标方向，不随视角旋转变化。
```

---

## 12.5 玩家操作方式

### 12.5.1 方向按钮

控制面板提供 6 个方向按钮：

```txt
平面移动
┌──────────────┐
│      Y-      │
│ X-        X+ │
│      Y+      │
└──────────────┘

层级移动
┌──────┬──────┐
│ Z+   │ Z-   │
└──────┴──────┘
```

按钮文案：

| 按钮 | 文案 |
|---|---|
| `X_NEG` | 左 X- |
| `X_POS` | 右 X+ |
| `Y_NEG` | 前 Y- |
| `Y_POS` | 后 Y+ |
| `Z_POS` | 上 Z+ |
| `Z_NEG` | 下 Z- |

---

### 12.5.2 键盘快捷键

必须支持键盘操作。

推荐映射：

| 按键 | 指令 |
|---|---|
| ArrowLeft | `X_NEG` |
| ArrowRight | `X_POS` |
| ArrowUp | `Y_NEG` |
| ArrowDown | `Y_POS` |
| Q | `Z_POS` |
| E | `Z_NEG` |
| U 或 Ctrl+Z | 撤回 |
| R | 重置，需二次确认 |
| Esc | 打开退出确认 |

说明：

1. 使用箭头键表达平面方向，符合直觉。
2. Q/E 控制层级，避免和 WASD 摄像机操作冲突。
3. 如果启用 OrbitControls，鼠标负责视角，键盘负责指令。
4. 所有快捷键在输入框聚焦时禁用。

---

### 12.5.3 操作确认与防误触

对于重置：

```txt
点击重置 → 弹出确认
```

确认文案：

```txt
确定重置当前盘面吗？当前已输入的指令会被清空，但计时不会重置。
```

对于退出：

```txt
点击退出 → 弹出确认
```

确认文案：

```txt
确定放弃当前挑战吗？本次成绩不会被记录。
```

撤回不需要确认，但如果频繁撤回可记录 `undoCount`。

---

## 12.6 侧边信息面板

Game Info Panel 显示：

```txt
题目名称
当前步数 commandCount
当前用时 duration
访问进度 visited / required
移动距离 travelDistance
撤回次数 undoCount
重置次数 resetCount
```

示例：

```txt
绝对指令 · 题目 001

Steps        18
Time         02:31
Visited      158 / 192
Distance     67
Undo         2
Reset        0
```

访问进度条：

```txt
Visited 158 / 192
████████░░ 82%
```

---

## 12.7 Layer MiniMap

由于 3D 迷宫信息密度高，必须提供三层小地图辅助观察。

布局：

```txt
Layer 3
8×8 mini grid

Layer 2
8×8 mini grid

Layer 1
8×8 mini grid
```

每个小地图格子颜色与 3D 方块一致：

1. 灰：未访问。
2. 蓝：已访问。
3. 黄：黄色停止格。
4. 红：红色阻挡格。
5. 绿：当前位置。
6. 数字：显示 remainingPasses。

点击小地图某层：

```txt
主摄像机聚焦到该层
```

MiniMap 不用于输入移动，只用于观察和定位。

---

## 12.8 指令历史面板

可选但推荐。

展示最近 10 条指令：

```txt
18  X+  (2,3,1) → (7,3,1)  Boundary
17  Z-  (2,3,2) → (2,3,1)  Yellow
16  Y-  (2,7,2) → (2,3,2)  Red Block
```

用途：

1. 便于玩家复盘。
2. 支持撤回前确认。
3. 后续可以做回放。

---

## 12.9 结果弹窗

完成后显示：

```txt
┌──────────────────────────────┐
│ Challenge Complete            │
│                              │
│ 绝对指令 · 题目 001           │
│                              │
│ Steps        18               │
│ Time         02:31            │
│ Distance     67               │
│ Visited      192 / 192        │
│ Rank         #4               │
│                              │
│ New Personal Best             │
│                              │
│ [再挑战一次] [查看排行榜]      │
└──────────────────────────────┘
```

如果不是个人最佳：

```txt
Best: 16 steps / 02:40
This run: 18 steps / 02:31
```

说明：虽然本次用时更短，但步数更多，因此不是更好成绩。

---

## 13. 前端组件设计

新增目录：

```txt
features/games/absolute-command/
  AbsoluteCommandPuzzleListPage.tsx
  AbsoluteCommandPuzzleDetailPage.tsx
  AbsoluteCommandPlayPage.tsx

  components/
    AbsoluteCommandMaze3D.tsx
    AbsoluteCommandCube.tsx
    AbsoluteCommandNumberLabel.tsx
    AbsoluteCommandPlayerMarker.tsx
    AbsoluteCommandDirectionPad.tsx
    AbsoluteCommandLayerMiniMap.tsx
    AbsoluteCommandInfoPanel.tsx
    AbsoluteCommandHistoryPanel.tsx
    AbsoluteCommandResultModal.tsx
    AbsoluteCommandViewControls.tsx

  hooks/
    useAbsoluteCommandAttempt.ts
    useAbsoluteCommandKeyboard.ts
    useAbsoluteCommandTimer.ts
    useAbsoluteCommandCamera.ts

  utils/
    coord.ts
    color.ts
    format.ts
```

复用通用组件：

```txt
GamePlayLayout
GameHud
GameControlBar
LeaderboardPreview
LeaderboardTable
Button
Card
Badge
Modal
Tabs
Skeleton
EmptyState
```

---

## 14. 前后端同步策略

为了操作顺滑，前端可以先本地模拟动画，但必须以服务端返回为准。

推荐 MVP 流程：

```txt
用户输入 direction
  ↓
发送 API
  ↓
收到 commandResult
  ↓
播放动画
  ↓
更新状态
```

优点：

1. 实现简单。
2. 不会出现本地预测与服务端不一致。
3. 更适合初版。

后续可优化为 optimistic simulation：

```txt
用户输入 direction
  ↓
前端本地模拟并动画
  ↓
同时请求服务端
  ↓
服务端返回后校验一致性
  ↓
不一致则以服务端状态覆盖
```

---

## 15. 安全与反作弊

### 15.1 可信边界

以下数据由服务端权威维护：

```txt
attempt.status
startedAt
completedAt
durationMs
commandCount
runtimeState
visitedCells
numberStates
redCells
leaderboard update
```

前端不能提交：

```txt
durationMs
commandCount
visitedCells
completed=true
```

前端只提交：

```txt
direction
```

撤回和重置也必须走服务端。

---

### 15.2 防作弊措施

必须实现：

1. attempt 属于当前用户。
2. attempt 状态必须为 STARTED 才能执行指令。
3. direction 必须是六个合法值之一。
4. 服务端重新模拟每一步。
5. 完成时间由服务端计算。
6. 排行榜只接收服务端完成结果。
7. completed attempt 不允许继续执行指令、撤回、重置。
8. 题目 referenceSolution 不返回前端。
9. 管理员接口必须鉴权。
10. 高频 command 接口限流。

限流建议：

```txt
commands: 120 requests / minute / user
undo: 60 requests / minute / user
reset: 20 requests / minute / user
```

---

## 16. 错误处理

### 16.1 无效方向

如果输入方向没有产生移动：

```ts
{
  moved: false,
  invalidReason: "NO_MOVEMENT"
}
```

前端提示：

```txt
该方向无法移动
```

不增加步数。

---

### 16.2 Attempt 已完成

```txt
ATTEMPT_ALREADY_COMPLETED
```

前端行为：

1. 禁用控制按钮。
2. 展示结果。
3. 引导查看排行榜。

---

### 16.3 Attempt 不属于当前用户

```txt
FORBIDDEN_ATTEMPT
```

前端跳转题目详情页或显示无权限。

---

### 16.4 题目已下架

如果用户打开已下架题目：

```txt
PUZZLE_NOT_AVAILABLE
```

如果 attempt 已开始但题目后来下架：

```txt
允许继续完成该 attempt
```

因为 attempt 已保存 puzzle snapshot。

---

## 17. 测试要求

### 17.1 Game Engine 单元测试

必须覆盖：

1. 坐标越界检测。
2. 六个方向 delta 正确。
3. 遇边界停止在最后一格。
4. 遇黄色格进入并停止。
5. 遇红色格停在前一格。
6. 数字格每次进入 remainingPasses 减一。
7. 数字格归零后加入 redCells。
8. 动态红色格后续不可进入。
9. 起点计入 visited。
10. 重复经过普通格不会破坏 visited。
11. commandCount 按有效指令计数。
12. 无移动指令不增加 commandCount。
13. travelDistance 按经过格子数累计。
14. 所有 requiredVisitCells 访问后 completed=true。
15. undo 能恢复 position、visitedCells、numberStates、redCells、commandCount。
16. reset 能恢复初始 runtime state。

---

### 17.2 后端测试

必须覆盖：

1. 获取题目列表。
2. 获取题目详情不包含 referenceSolution。
3. start attempt 创建 puzzle snapshot。
4. command API 返回正确 path 和 stopReason。
5. 黄色停止格逻辑正确。
6. 红色阻挡逻辑正确。
7. 数字格变红逻辑正确。
8. undo 恢复上一状态。
9. reset 恢复初始状态但不重置 startedAt。
10. 完成后 attempt 标记 COMPLETED。
11. 完成后排行榜更新。
12. 排行榜按 commandCount ASC、durationMs ASC 排序。
13. 其他用户不能操作 attempt。
14. completed attempt 不能继续 command/undo/reset。
15. 下架题目不能新开 attempt。
16. 已开始 attempt 不受题目后续版本变更影响。

---

### 17.3 前端测试

必须覆盖：

1. 题目列表正确展示。
2. 题目详情展示 3D 预览和排行榜。
3. play 页渲染 8×8×3 方块。
4. 方向按钮触发 command API。
5. 键盘快捷键触发正确方向。
6. 指令执行时禁用重复输入。
7. 路径动画后状态更新。
8. 数字格 remainingPasses 显示正确。
9. 数字格归零后变红。
10. 黄色格停止反馈正确。
11. 撤回按钮恢复上一状态。
12. 重置按钮恢复初始盘面。
13. 完成后弹出 Result Modal。
14. 移动端 Direction Pad 可用。
15. Layer MiniMap 与主 3D 状态一致。

---

## 18. Seed 题目要求

MVP 至少提供 3 道人工题：

```txt
题目 001：入门
题目 002：标准
题目 003：困难
```

每道题必须包含：

1. title。
2. difficultyLabel。
3. startCoord。
4. cells 配置。
5. referenceSolution。
6. validationReport。
7. estimatedDuration。
8. optimalCommandCount。

Seed 时必须执行 validator：

```txt
referenceSolution 能完成题目 → 才允许 seed 为 PUBLISHED
```

如果没有人工题，可以先用小范围可验证样例作为开发题，但不要标注为正式节目题。

---

## 19. 游戏规则说明文案

详情页规则摘要：

```txt
你将进入一个 8×8×3 的三维迷宫。每次输入一个绝对方向指令后，角色会沿该方向持续移动，直到遇到停止条件。

黄色方格会让角色停在该格；
红色方格不可进入，角色会停在红色方格前一格；
数字方格每经过一次数字减一，当经过次数达到标示数字后，该格会变为红色。

你需要通过尽可能少的方向指令，经过迷宫内所有需要访问的方格。
排行榜优先比较步数，步数相同时比较完成用时。
```

游戏页短提示：

```txt
输入绝对方向指令，持续移动并覆盖所有方格。黄色停止，红色阻挡，数字归零后变红。
```

方向提示：

```txt
方向为固定坐标方向，不随视角旋转变化。
```

---

## 20. 实现顺序

### Step 1：注册游戏元信息

1. 新增 game slug：`absolute-command`。
2. 新增游戏详情元信息。
3. 新增题目列表入口。
4. 游戏卡片展示来源、类型、能力维度。

能力维度建议：

```ts
[
  { key: "spatial", label: "三维空间", value: 96 },
  { key: "planning", label: "路径规划", value: 94 },
  { key: "logic", label: "规则推演", value: 88 },
  { key: "memory", label: "工作记忆", value: 82 }
]
```

---

### Step 2：实现 game-engine

1. 新增 absolute-command engine。
2. 实现坐标和方向工具。
3. 实现移动模拟。
4. 实现数字格状态变化。
5. 实现完成检测。
6. 实现 undo/reset。
7. 编写单元测试。

---

### Step 3：数据库迁移

1. 新增 AbsoluteCommandPuzzle。
2. 新增 AbsoluteCommandPuzzleVersion。
3. 可选新增 AbsoluteCommandLog。
4. GameAttempt metadata 存储 puzzle snapshot 和 runtime state。
5. 新增每题排行榜定义。

---

### Step 4：后端 API

1. 题目列表。
2. 题目详情。
3. start attempt。
4. execute command。
5. undo。
6. reset。
7. abandon。
8. puzzle leaderboard。
9. 接入 leaderboard service。
10. 接入管理员题库校验器。

---

### Step 5：前端页面

1. 题目列表页。
2. 题目详情页。
3. 3D Maze View。
4. Direction Pad。
5. Layer MiniMap。
6. Info Panel。
7. History Panel。
8. Result Modal。
9. 键盘快捷键。
10. 移动端布局。

---

### Step 6：管理员扩展预留

1. 先不做完整后台 UI，但保留 admin API 结构。
2. 提供 seed/脚本导入题目。
3. 提供 validate puzzle 脚本。
4. 题目版本机制必须先落库。

---

## 21. 验收标准

完成后必须满足：

1. `/games/absolute-command` 可以看到《绝对指令》游戏入口和题目列表。
2. 玩家可以选择任意已发布题目。
3. 每个题目有独立详情页和排行榜。
4. 玩家可以开始一个题目 attempt。
5. 游戏页以 3D 方式展示 8×8×3 迷宫。
6. 每个格子以立方体形式展示。
7. 黄色方格、红色方格、数字方格、当前位置有清晰视觉区分。
8. 玩家可以通过 6 个方向按钮输入绝对方向。
9. 玩家可以通过键盘快捷键输入方向。
10. 单次方向指令会持续移动直到触发停止条件。
11. 遇黄色方格停在黄色方格处。
12. 遇红色方格停在红色方格前一格。
13. 经过数字方格时数字减一。
14. 数字方格归零后变为红色。
15. 方格可以重复经过。
16. 系统正确记录已访问方格。
17. 访问所有 required cells 后挑战完成。
18. 完成时记录 commandCount 和 durationMs。
19. 排行榜按 commandCount ASC、durationMs ASC 排序。
20. 撤回按钮能撤销上一条有效指令。
21. 重置按钮能恢复初始盘面。
22. 页面刷新后可以恢复当前 attempt。
23. 完成后的 attempt 不允许继续操作。
24. 前端不能伪造成绩。
25. 题目数据来自数据库，不是随机生成。
26. 题目版本机制能支持后续管理员编辑。
27. 移动端可完成基础操作。
28. 现有 SuperBrain 页面风格不被破坏。

---

## 22. 后续扩展方向

1. 管理员可视化 3D 题目编辑器。
2. 玩家回放功能。
3. 最优解验证器。
4. 自动求解器辅助校验题目质量。
5. 多视角同步显示。
6. 指令序列导入 / 导出。
7. 竞速模式。
8. 每日题。
9. 无撤回排行榜。
10. 专家模式隐藏 Layer MiniMap。
