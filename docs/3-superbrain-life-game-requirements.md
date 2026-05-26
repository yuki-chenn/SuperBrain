# SuperBrain 新增游戏需求设计文档：《生命游戏》

> 游戏来源：最强大脑第十三季第一期  
> 游戏类型：细胞自动机推理 / 稳态预测 / 空间模式识别  
> 目标：在现有 SuperBrain 多游戏平台中新增《生命游戏》，支持多难度、目标区域提交、错误反馈、计时排行榜和后续扩展。

---

## 1. 游戏概述

《生命游戏》基于 Conway's Game of Life。棋盘由细胞网格组成，每个格子有两种状态：

```txt
灰格：死亡细胞
黄格：存活细胞
```

每个细胞下一轮状态由周围 8 个邻居决定。规则为：

```txt
B3/S23
```

含义：

1. `B3`：死亡细胞周围恰好有 3 个存活邻居时，下一轮变为存活。
2. `S23`：存活细胞周围有 2 或 3 个存活邻居时，下一轮继续存活。
3. 其他情况：下一轮为死亡。

节目版本中，现场环屏为：

```txt
120 × 15 网格
```

网格平均划分为 12 个区域。玩家会收到若干目标区域，需要观察初始细胞分布图，推理细胞迭代完成后，在目标区域内进入稳定状态的细胞形状及其对应位置。

本平台版本将其设计为一个可交互网页游戏。

---

## 2. 核心玩法目标

玩家需要完成：

1. 观察完整初始细胞分布图。
2. 根据 Conway 生命游戏规则推理最终稳定状态。
3. 在指定目标区域中填写 / 选择最终存活细胞的位置。
4. 可以分别提交每个目标区域。
5. 系统提示该目标区域是否正确。
6. 全部目标区域正确后，游戏结束。
7. 记录总用时和错误次数。
8. 排行榜按用时优先、错误次数其次排序。

---

## 3. 游戏术语

| 术语 | 含义 |
|---|---|
| `Cell` | 一个细胞格子 |
| `Alive` | 存活状态，视觉上显示为黄格 |
| `Dead` | 死亡状态，视觉上显示为灰格 |
| `Generation` | 迭代轮次 |
| `Initial State` | 初始细胞分布 |
| `Stable State` | 稳定状态 |
| `Target Region` | 玩家需要作答的目标区域 |
| `Region` | 120×15 网格被划分后的一个区域 |
| `Submission` | 玩家对某个目标区域提交的答案 |
| `Error Count` | 错误提交次数 |
| `Duration` | 从开始挑战到全部目标区域正确的总耗时 |

---

## 4. 棋盘与区域设计

### 4.1 全局棋盘

棋盘尺寸固定为：

```ts
const LIFE_BOARD_WIDTH = 120;
const LIFE_BOARD_HEIGHT = 15;
```

坐标系：

```txt
x: 0 - 119，从左到右
y: 0 - 14，从上到下
```

一个细胞用坐标表示：

```ts
interface CellCoord {
  x: number;
  y: number;
}
```

棋盘状态推荐使用稀疏坐标列表存储：

```ts
interface LifeBoardState {
  width: 120;
  height: 15;
  aliveCells: CellCoord[];
}
```

原因：

1. 稀疏存储更节省空间。
2. 易于序列化。
3. 便于目标区域答案对比。
4. 前端渲染时可转换为 `Set<string>`。

---

### 4.2 区域划分

120×15 网格平均划分为 12 个区域。

每个区域宽度：

```txt
120 / 12 = 10
```

每个区域尺寸：

```txt
10 × 15
```

区域编号：

```txt
Region 1:  x = 0   - 9
Region 2:  x = 10  - 19
Region 3:  x = 20  - 29
Region 4:  x = 30  - 39
Region 5:  x = 40  - 49
Region 6:  x = 50  - 59
Region 7:  x = 60  - 69
Region 8:  x = 70  - 79
Region 9:  x = 80  - 89
Region 10: x = 90  - 99
Region 11: x = 100 - 109
Region 12: x = 110 - 119
```

结构定义：

```ts
interface LifeRegion {
  id: number;        // 1 - 12
  label: string;     // "区域 1"
  xStart: number;
  xEnd: number;
  yStart: 0;
  yEnd: 14;
  width: 10;
  height: 15;
}
```

工具函数：

```ts
function getRegionById(regionId: number): LifeRegion;

function getRegionIdByCell(x: number, y: number): number;

function isCellInRegion(cell: CellCoord, regionId: number): boolean;
```

---

### 4.3 环屏边界规则

因为节目描述为“环屏”，本平台默认采用：

```txt
水平方向环绕
垂直方向不环绕
```

即：

1. `x = -1` 等价于 `x = 119`。
2. `x = 120` 等价于 `x = 0`。
3. `y < 0` 或 `y >= 15` 视为棋盘外，不存在邻居。

配置：

```ts
interface LifeBoundaryRule {
  wrapX: boolean;
  wrapY: boolean;
}
```

默认：

```ts
const DEFAULT_LIFE_BOUNDARY_RULE = {
  wrapX: true,
  wrapY: false,
};
```

如果后续确认节目规则不是水平环绕，可以将 `wrapX` 设为 false。所有推演逻辑必须通过配置控制，不要写死边界策略。

---

## 5. 生命游戏规则

### 5.1 B3/S23

对每个细胞统计周围 8 邻域中的存活细胞数：

```txt
aliveNeighborCount
```

下一代规则：

| 当前状态 | 存活邻居数 | 下一状态 |
|---|---:|---|
| Dead | 3 | Alive |
| Dead | 其他 | Dead |
| Alive | 2 或 3 | Alive |
| Alive | 其他 | Dead |

函数定义：

```ts
type CellState = 0 | 1;

interface LifeStepInput {
  state: LifeBoardState;
  boundary: LifeBoundaryRule;
}

function countAliveNeighbors(
  state: LifeBoardState,
  x: number,
  y: number,
  boundary: LifeBoundaryRule,
): number;

function stepLife(input: LifeStepInput): LifeBoardState;
```

---

### 5.2 稳定状态定义

MVP 中将“稳定状态”定义为：

```txt
Fixed Point：下一代状态与当前状态完全相同
```

即：

```ts
isSameBoard(current, next) === true
```

这类稳定状态不会继续变化。

需要注意：Conway 生命游戏中存在振荡器，例如周期为 2 的 blinker。它不是 fixed point，但会周期循环。为了保证游戏判定明确，题库生成时必须避免目标进入振荡状态。

后端推演时需要同时支持：

```ts
interface LifeSimulationResult {
  status: "STABLE" | "OSCILLATING" | "MAX_GENERATION_REACHED";
  stableState?: LifeBoardState;
  finalState: LifeBoardState;
  generations: number;
  period?: number;
}
```

MVP 题目要求：

```txt
只有 status === "STABLE" 的题目允许进入正式题库。
```

如果检测到：

```txt
OSCILLATING
MAX_GENERATION_REACHED
```

则该题不能作为正式挑战题。

---

### 5.3 最大迭代次数

为了避免无限推演，设置最大迭代次数：

```ts
const LIFE_MAX_GENERATIONS = 100;
```

模拟流程：

```txt
initialState
  ↓ step
generation 1
  ↓ step
generation 2
  ...
  ↓
stable or max generation
```

如果 100 代内没有 fixed point，则判定为不可用题目。

---

## 6. 难度设计

游戏设置 3 种难度。

| 难度 key | 名称 | 目标区域数 | 推荐说明 |
|---|---|---:|---|
| `easy` | 入门 | 1 | 只需推理 1 个目标区域 |
| `normal` | 标准 | 2 | 需要同时处理 2 个目标区域 |
| `hard` | 挑战 | 3 | 需要处理 3 个目标区域，记忆和推理压力更高 |

定义：

```ts
const LIFE_GAME_DIFFICULTIES = [
  {
    key: "easy",
    label: "入门",
    targetRegionCount: 1,
    description: "推理 1 个目标区域",
  },
  {
    key: "normal",
    label: "标准",
    targetRegionCount: 2,
    description: "推理 2 个目标区域",
    recommended: true,
  },
  {
    key: "hard",
    label: "挑战",
    targetRegionCount: 3,
    description: "推理 3 个目标区域",
  },
] as const;
```

难度只影响：

1. 目标区域数量。
2. 排行榜分榜。
3. 视觉和提示文案。

不直接影响：

1. 棋盘尺寸。
2. Conway 规则。
3. 稳定状态判定。

后续可以扩展更多难度变量，例如：

1. 初始图案复杂度。
2. 迭代代数范围。
3. 目标区域相邻程度。
4. 是否允许查看辅助坐标。
5. 是否隐藏非目标区域的中间提示。

---

## 7. 游戏数据结构

### 7.1 游戏元信息

```ts
const lifeGameMeta = {
  slug: "life-game",
  title: "生命游戏",
  subtitle: "推演细胞自动机，预测稳定区域",
  description:
    "观察 120×15 环屏网格中的初始细胞分布，根据 B3/S23 生命游戏规则，推理目标区域进入稳定状态后的存活细胞位置。",
  source: "最强大脑第十三季第一期 / Conway's Game of Life",
  status: "PUBLISHED",
  dimensions: [
    { key: "logic", label: "逻辑推演", value: 94 },
    { key: "spatial", label: "空间观察", value: 88 },
    { key: "attention", label: "专注控制", value: 86 },
    { key: "memory", label: "工作记忆", value: 78 },
  ],
  difficultyLevels: LIFE_GAME_DIFFICULTIES,
  tags: ["细胞自动机", "逻辑推演", "空间观察", "稳定状态"],
  visual: {
    accentColor: "#facc15",
    backgroundPattern: "grid",
  },
};
```

---

### 7.2 题目结构

题目由后端生成或从题库读取。

```ts
interface LifePuzzle {
  id: string;
  difficultyKey: "easy" | "normal" | "hard";

  width: 120;
  height: 15;

  boundary: LifeBoundaryRule;

  initialState: LifeBoardState;

  stableState: LifeBoardState;

  targetRegionIds: number[];

  targetAnswers: LifeTargetAnswer[];

  stableGeneration: number;

  metadata: {
    source?: string;
    complexityScore?: number;
    createdBy?: "generated" | "manual";
    notes?: string;
  };
}
```

目标区域答案：

```ts
interface LifeTargetAnswer {
  regionId: number;

  // 使用区域内局部坐标，x: 0-9, y: 0-14
  aliveCells: LocalCellCoord[];
}

interface LocalCellCoord {
  x: number;
  y: number;
}
```

为什么答案使用局部坐标：

1. 前端目标区域编辑器更简单。
2. 用户只需要在目标区域内作答。
3. 后端可以明确比较该区域答案。
4. 排除非目标区域干扰。

全局坐标与局部坐标转换：

```ts
function toLocalCoord(cell: CellCoord, region: LifeRegion): LocalCellCoord {
  return {
    x: cell.x - region.xStart,
    y: cell.y,
  };
}

function toGlobalCoord(cell: LocalCellCoord, region: LifeRegion): CellCoord {
  return {
    x: region.xStart + cell.x,
    y: cell.y,
  };
}
```

---

### 7.3 Attempt 结构

一次挑战记录：

```ts
interface LifeGameAttempt {
  id: string;
  userId: string;
  gameSlug: "life-game";
  difficultyKey: "easy" | "normal" | "hard";

  puzzleId: string;

  status: "STARTED" | "COMPLETED" | "ABANDONED" | "INVALID";

  startedAt: string;
  completedAt?: string;

  targetRegionIds: number[];

  correctRegionIds: number[];

  errorCount: number;

  submissions: LifeRegionSubmission[];

  metrics?: {
    durationMs: number;
    errorCount: number;
    targetRegionCount: number;
    stableGeneration: number;
  };
}
```

提交记录：

```ts
interface LifeRegionSubmission {
  id: string;
  regionId: number;
  submittedAt: string;
  aliveCells: LocalCellCoord[];
  correct: boolean;
}
```

---

## 8. 作答与判定规则

### 8.1 作答方式

玩家在每个目标区域中点击格子进行作答：

```txt
点击死亡格 → 标记为存活
点击存活格 → 取消标记
```

目标区域编辑器尺寸：

```txt
10 × 15
```

每个目标区域可以独立编辑、独立提交。

---

### 8.2 提交方式

玩家可以分别提交目标区域：

```txt
区域 3：提交
区域 7：提交
区域 11：提交
```

每次提交后，系统返回：

```txt
Correct
Incorrect
```

如果正确：

1. 该区域锁定。
2. 不能继续编辑。
3. 该区域加入 `correctRegionIds`。
4. 不增加错误次数。

如果错误：

1. 该区域保持可编辑。
2. `errorCount += 1`。
3. 记录一次错误 submission。
4. 不直接展示正确答案。

全部目标区域正确后：

```txt
attempt.status = COMPLETED
completedAt = now
durationMs = completedAt - startedAt
```

---

### 8.3 答案比较

答案比较必须忽略顺序。

```ts
function normalizeCells(cells: LocalCellCoord[]): string[] {
  return cells
    .map((cell) => `${cell.x},${cell.y}`)
    .sort();
}

function isSameCellSet(a: LocalCellCoord[], b: LocalCellCoord[]): boolean {
  const na = normalizeCells(a);
  const nb = normalizeCells(b);

  if (na.length !== nb.length) return false;

  return na.every((value, index) => value === nb[index]);
}
```

提交校验：

1. `regionId` 必须属于本次 attempt 的 `targetRegionIds`。
2. `regionId` 如果已经正确，则不允许重复提交。
3. 所有坐标必须在局部区域范围内：
   - `0 <= x < 10`
   - `0 <= y < 15`
4. 坐标不能重复。
5. `aliveCells` 最大数量不能超过 150。
6. answer 必须与 stableState 中对应区域的 alive cells 完全一致。

---

## 9. 排行榜规则

### 9.1 排行榜分榜

三个难度分别建立排行榜：

```txt
life-game-easy
life-game-normal
life-game-hard
```

展示名：

```txt
生命游戏 · 入门榜
生命游戏 · 标准榜
生命游戏 · 挑战榜
```

---

### 9.2 排序规则

排行榜排序优先级：

```txt
1. durationMs ASC
2. errorCount ASC
3. completedAt ASC
```

解释：

1. 用时越短排名越高。
2. 用时相同时，错误次数越少排名越高。
3. 用时和错误次数都相同时，更早完成者排名更高。

LeaderboardDefinition：

```ts
{
  slug: "life-game-normal",
  name: "生命游戏 · 标准榜",
  gameSlug: "life-game",
  difficultyKey: "normal",
  rankMetric: "durationMs",
  rankDirection: "ASC",
  tieBreakers: [
    { metric: "errorCount", direction: "ASC" },
    { metric: "completedAt", direction: "ASC" }
  ],
  entryPolicy: "BEST_PER_USER"
}
```

---

### 9.3 个人最佳

同一用户同一难度只保留最好成绩。

更好成绩判断：

```txt
durationMs 更小 → 更新
durationMs 相同且 errorCount 更小 → 更新
durationMs 和 errorCount 都相同且 completedAt 更早 → 更新
否则不更新
```

---

## 10. 前端页面设计

### 10.1 游戏详情页

路径：

```txt
/games/life-game
```

布局沿用 SuperBrain 通用游戏详情页。

页面展示：

1. 游戏标题：生命游戏
2. 副标题：推演细胞自动机，预测稳定区域
3. 来源：最强大脑第十三季第一期 / Conway's Game of Life
4. 考察维度：
   - 逻辑推演
   - 空间观察
   - 专注控制
   - 工作记忆
5. 难度选择：
   - 入门：1 个目标区域
   - 标准：2 个目标区域
   - 挑战：3 个目标区域
6. 规则摘要：
   - 灰格代表死亡细胞
   - 黄格代表存活细胞
   - 规则为 B3/S23
   - 需要推理稳定状态下目标区域中的存活细胞位置
7. 右侧排行榜：
   - 当前选择难度的 Top 5
   - 当前用户个人最佳
8. 按钮：
   - 开始挑战
   - 查看完整排行榜
   - 查看规则

---

### 10.2 游戏游玩页

路径：

```txt
/games/life-game/play
```

#### 桌面布局

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ TopNav                                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────┐ ┌──────────────────────────────┐ ┌───────────────┐ │
│ │ Game Info          │ │ Game Stage                   │ │ Target Panel   │ │
│ │                    │ │                              │ │               │ │
│ │ 生命游戏            │ │ 120×15 Initial Board          │ │ 目标区域        │ │
│ │ 标准 · 2 区域        │ │                              │ │ [区域 3] ✅     │ │
│ │                    │ │ ┌──────────────────────────┐ │ │ [区域 8] 编辑中 │ │
│ │ Time   02:31        │ │ │                          │ │ │               │ │
│ │ Errors 1            │ │ │       Full Board         │ │ │ 区域编辑器      │ │
│ │                    │ │ │                          │ │ │ 10×15 Grid     │ │
│ │ [重开] [退出]       │ │ └──────────────────────────┘ │ │ [提交区域]     │ │
│ └────────────────────┘ └──────────────────────────────┘ └───────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

推荐三栏：

```txt
left panel: 240px
center stage: flexible
right panel: 320px
```

#### 移动端布局

```txt
┌──────────────────────────────┐
│ 生命游戏 · 标准               │
│ Time 02:31    Errors 1        │
│                              │
│ 120×15 Initial Board          │
│                              │
│ Target Region Tabs            │
│ [区域 3] [区域 8]             │
│                              │
│ 10×15 Answer Grid             │
│                              │
│ [提交当前区域]                │
│                              │
│ Rules / Ranking Tabs          │
└──────────────────────────────┘
```

移动端要求：

1. 初始棋盘可以横向缩放展示。
2. 目标区域作答区必须可点击，不要过小。
3. 120×15 全局棋盘在移动端用于观察，不用于精细编辑。
4. 目标区域编辑器使用 10×15 大格子，保证触控可用。
5. 排行榜和规则放入折叠区域。

---

### 10.3 游戏页组件拆分

```txt
features/games/life-game/
  LifeGamePlayPage.tsx
  LifeInitialBoard.tsx
  LifeRegionAnswerEditor.tsx
  LifeTargetRegionTabs.tsx
  LifeTargetPanel.tsx
  LifeRulesPanel.tsx
  LifeResultModal.tsx
  hooks/
    useLifeGameAttempt.ts
    useLifeAnswerDraft.ts
  utils/
    coord.ts
    render.ts
```

通用布局复用：

```txt
GamePlayLayout
GameInfoPanel
GameStage
GameHud
GameControlBar
GameResultModal
LeaderboardPreview
```

---

## 11. 前端交互细节

### 11.1 开始挑战

用户点击开始挑战：

```txt
POST /api/games/life-game/attempts/start
```

后端返回：

1. `attemptId`
2. `difficultyKey`
3. `initialState`
4. `targetRegionIds`
5. `startedAt`
6. `boundary`
7. `width / height`

前端：

1. 渲染完整初始棋盘。
2. 渲染目标区域 tab。
3. 初始化每个目标区域的空答案 draft。
4. 启动本地计时器。
5. 错误次数显示为 0。

---

### 11.2 目标区域编辑

每个目标区域维护独立 draft：

```ts
type LifeAnswerDraftMap = Record<number, LocalCellCoord[]>;
```

点击格子：

```ts
toggleCell(regionId, localX, localY)
```

如果该区域已 correct，则禁止编辑。

---

### 11.3 提交目标区域

提交当前区域：

```txt
POST /api/games/life-game/attempts/:attemptId/regions/:regionId/submit
```

Request：

```ts
interface SubmitLifeRegionRequest {
  aliveCells: LocalCellCoord[];
}
```

Response：

```ts
interface SubmitLifeRegionResponse {
  regionId: number;
  correct: boolean;
  errorCount: number;
  correctRegionIds: number[];
  attemptCompleted: boolean;
  result?: {
    durationMs: number;
    errorCount: number;
    rank?: number;
    personalBest: boolean;
  };
}
```

如果 correct：

1. 当前区域显示绿色状态或 `Correct` badge。
2. 锁定该区域。
3. 自动切换到下一个未完成目标区域。
4. 如果全部完成，弹出结果弹窗。

如果 incorrect：

1. 显示错误提示。
2. 错误次数 +1。
3. 保持当前区域可编辑。
4. 不展示正确答案。

---

### 11.4 放弃 / 重开

#### 放弃

用户点击退出：

```txt
POST /api/games/life-game/attempts/:attemptId/abandon
```

然后跳回游戏详情页。

#### 重开

用户点击重开：

1. 如果当前 attempt 未完成，先 abandon。
2. 重新 start attempt。
3. 清空本地 draft。
4. 重置时间和错误次数。

---

## 12. 后端 API 设计

### 12.1 Start Attempt

```txt
POST /api/games/life-game/attempts/start
```

Request：

```ts
interface StartLifeAttemptRequest {
  difficultyKey: "easy" | "normal" | "hard";
}
```

Response：

```ts
interface StartLifeAttemptResponse {
  attemptId: string;
  gameSlug: "life-game";
  difficultyKey: "easy" | "normal" | "hard";

  width: 120;
  height: 15;

  boundary: LifeBoundaryRule;

  initialState: LifeBoardState;

  targetRegionIds: number[];

  startedAt: string;
}
```

注意：

后端不要返回 `stableState` 和 `targetAnswers`。

---

### 12.2 Submit Region

```txt
POST /api/games/life-game/attempts/:attemptId/regions/:regionId/submit
```

Request：

```ts
interface SubmitLifeRegionRequest {
  aliveCells: LocalCellCoord[];
}
```

Response：

```ts
interface SubmitLifeRegionResponse {
  regionId: number;
  correct: boolean;
  errorCount: number;
  correctRegionIds: number[];

  attemptCompleted: boolean;

  result?: {
    durationMs: number;
    errorCount: number;
    targetRegionCount: number;
    rank?: number;
    personalBest: boolean;
  };
}
```

后端行为：

1. 校验用户登录。
2. 校验 attempt 属于当前用户。
3. 校验 attempt 状态是 `STARTED`。
4. 校验 regionId 属于 attempt.targetRegionIds。
5. 校验 regionId 尚未正确完成。
6. 校验 aliveCells 坐标合法且无重复。
7. 读取 puzzle 的 targetAnswer。
8. 比较提交答案。
9. 如果错误：
   - errorCount + 1
   - 保存 submission
   - 返回 correct=false
10. 如果正确：
   - 保存 submission
   - 将 regionId 加入 correctRegionIds
   - 如果全部目标区域正确：
     - completedAt = now
     - durationMs = completedAt - startedAt
     - status = COMPLETED
     - 更新排行榜
     - 返回 result
11. 不向前端泄露未完成区域答案。

---

### 12.3 Get Attempt

```txt
GET /api/games/life-game/attempts/:attemptId
```

用途：

1. 页面刷新后恢复当前挑战。
2. 查看已完成状态。
3. 恢复 correctRegionIds、errorCount、targetRegionIds。

Response：

```ts
interface GetLifeAttemptResponse {
  attemptId: string;
  status: "STARTED" | "COMPLETED" | "ABANDONED" | "INVALID";
  difficultyKey: "easy" | "normal" | "hard";

  width: 120;
  height: 15;

  boundary: LifeBoundaryRule;

  initialState: LifeBoardState;

  targetRegionIds: number[];
  correctRegionIds: number[];

  errorCount: number;

  startedAt: string;
  completedAt?: string;

  submissions: Array<{
    regionId: number;
    submittedAt: string;
    correct: boolean;
  }>;

  metrics?: {
    durationMs: number;
    errorCount: number;
    targetRegionCount: number;
    stableGeneration: number;
  };
}
```

不要返回每次提交的具体 aliveCells，除非是当前用户自己的草稿保存功能。MVP 不保存草稿。

---

### 12.4 Abandon Attempt

```txt
POST /api/games/life-game/attempts/:attemptId/abandon
```

Response：

```ts
interface AbandonLifeAttemptResponse {
  success: true;
}
```

---

## 13. 数据库设计

如果已有通用 `GameAttempt` 表，生命游戏可以复用 `initialState`、`metrics`、`metadata` 等 JSON 字段。但为了支持区域级提交，建议新增游戏专属 submission 表。

### 13.1 LifePuzzle 表

```prisma
model LifePuzzle {
  id               String   @id @default(cuid())
  difficultyKey    String
  width            Int      @default(120)
  height           Int      @default(15)
  boundary         Json
  initialState     Json
  stableState      Json
  targetRegionIds  Json
  targetAnswers    Json
  stableGeneration Int
  status           String   @default("ACTIVE")
  metadata         Json     @default("{}")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  attempts         GameAttempt[]

  @@index([difficultyKey, status])
}
```

`targetAnswers` 示例：

```json
[
  {
    "regionId": 3,
    "aliveCells": [
      { "x": 1, "y": 4 },
      { "x": 2, "y": 4 },
      { "x": 3, "y": 4 }
    ]
  }
]
```

---

### 13.2 GameAttempt 扩展

通用 `GameAttempt` 中对生命游戏使用：

```ts
initialState: {
  width: 120,
  height: 15,
  aliveCells: [...]
}

metrics: {
  durationMs: 143000,
  errorCount: 2,
  targetRegionCount: 2,
  stableGeneration: 37
}

metadata: {
  puzzleId: "...",
  targetRegionIds: [3, 8],
  correctRegionIds: [3, 8],
  boundary: { wrapX: true, wrapY: false }
}
```

如果 `GameAttempt` 没有 metadata 字段，应新增：

```prisma
metadata Json @default("{}")
```

---

### 13.3 LifeRegionSubmission 表

```prisma
model LifeRegionSubmission {
  id          String   @id @default(cuid())
  attemptId   String
  userId      String
  regionId    Int
  aliveCells  Json
  correct     Boolean
  submittedAt DateTime @default(now())

  attempt     GameAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([attemptId])
  @@index([userId])
  @@index([attemptId, regionId])
}
```

---

## 14. Game Engine 设计

建议在共享引擎中新增：

```txt
packages/game-engine/src/life-game/
  types.ts
  regions.ts
  engine.ts
  simulation.ts
  validator.ts
  generator.ts
  index.ts
```

### 14.1 types.ts

```ts
export interface CellCoord {
  x: number;
  y: number;
}

export interface LocalCellCoord {
  x: number;
  y: number;
}

export interface LifeBoundaryRule {
  wrapX: boolean;
  wrapY: boolean;
}

export interface LifeBoardState {
  width: number;
  height: number;
  aliveCells: CellCoord[];
}

export interface LifeRegion {
  id: number;
  label: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  width: number;
  height: number;
}
```

### 14.2 regions.ts

```ts
export function getLifeRegions(): LifeRegion[];

export function getRegionById(regionId: number): LifeRegion;

export function getRegionIdByCell(x: number, y: number): number;

export function extractRegionAnswer(
  stableState: LifeBoardState,
  regionId: number,
): LocalCellCoord[];

export function toLocalCoord(
  cell: CellCoord,
  region: LifeRegion,
): LocalCellCoord;

export function toGlobalCoord(
  cell: LocalCellCoord,
  region: LifeRegion,
): CellCoord;
```

### 14.3 engine.ts

```ts
export function boardToAliveSet(state: LifeBoardState): Set<string>;

export function normalizeBoard(state: LifeBoardState): LifeBoardState;

export function countAliveNeighbors(
  state: LifeBoardState,
  x: number,
  y: number,
  boundary: LifeBoundaryRule,
): number;

export function stepLife(
  state: LifeBoardState,
  boundary: LifeBoundaryRule,
): LifeBoardState;

export function isSameBoard(
  a: LifeBoardState,
  b: LifeBoardState,
): boolean;
```

### 14.4 simulation.ts

```ts
export interface SimulateUntilStableInput {
  initialState: LifeBoardState;
  boundary: LifeBoundaryRule;
  maxGenerations: number;
  detectOscillation?: boolean;
}

export interface SimulateUntilStableResult {
  status: "STABLE" | "OSCILLATING" | "MAX_GENERATION_REACHED";
  finalState: LifeBoardState;
  stableState?: LifeBoardState;
  generations: number;
  period?: number;
}

export function simulateUntilStable(
  input: SimulateUntilStableInput,
): SimulateUntilStableResult;
```

### 14.5 validator.ts

```ts
export function validateLocalCells(input: {
  cells: LocalCellCoord[];
  regionWidth: number;
  regionHeight: number;
}): {
  valid: boolean;
  reason?: string;
};

export function isSameLocalCellSet(
  a: LocalCellCoord[],
  b: LocalCellCoord[],
): boolean;

export function validateRegionSubmission(input: {
  submittedCells: LocalCellCoord[];
  answerCells: LocalCellCoord[];
}): {
  correct: boolean;
};
```

---

## 15. Puzzle 生成与题库策略

MVP 推荐使用“题库优先”，而不是完全在线随机生成。

原因：

1. 必须保证题目会进入 stable fixed point。
2. 必须避免振荡器和长期混沌。
3. 必须保证目标区域内有足够可辨识形状。
4. 必须控制题目难度。
5. 随机生成的质量不可控。

### 15.1 题库生成流程

离线脚本：

```txt
生成 initialState
  ↓
simulateUntilStable
  ↓
如果 STABLE，提取 stableState
  ↓
选择 targetRegionIds
  ↓
提取 targetAnswers
  ↓
计算 complexityScore
  ↓
写入 LifePuzzle 表
```

只允许以下题目入库：

1. 100 代内稳定。
2. 目标区域最终存活细胞数量大于 0。
3. 目标区域最终存活细胞数量不超过 80。
4. 不同目标区域答案不是完全空白。
5. 目标区域形状具备可识别性。
6. stableGeneration 不宜过小，避免太简单。

### 15.2 题目选择策略

开始挑战时：

```ts
selectPuzzle(difficultyKey)
```

规则：

1. 从 `LifePuzzle.status = ACTIVE` 中选择。
2. 匹配 difficultyKey。
3. 优先选择用户最近没有玩过的题。
4. 如果没有历史记录，随机选择。
5. 不要在 start response 中暴露 stableState 和 targetAnswers。

---

## 16. 后端 GameAdapter 设计

新增：

```txt
apps/api/src/games/adapters/life-game.adapter.ts
```

接口：

```ts
export class LifeGameAdapter implements GameAdapter {
  slug = "life-game";

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>;

  async submitRegion(input: SubmitLifeRegionInput): Promise<SubmitLifeRegionResult>;

  async abandonAttempt(input: AbandonAttemptInput): Promise<void>;
}
```

如果现有 `GameAdapter` 只支持 start/finish，需要扩展为支持游戏自定义 action：

```ts
interface GameActionHandler {
  action: string;
  handle(input: GameActionInput): Promise<unknown>;
}
```

或者在 `LifeGameController` 中单独定义 region submit 接口。

推荐 MVP：

```txt
保留通用 start attempt
为生命游戏新增专属 submit-region endpoint
完成所有区域正确时，再调用通用 leaderboard service
```

---

## 17. 安全与反作弊

### 17.1 后端可信边界

以下信息不能给前端：

```txt
stableState
targetAnswers
非目标区域最终答案
```

前端只能获得：

```txt
initialState
targetRegionIds
boundary
width
height
```

### 17.2 防作弊措施

MVP 必须实现：

1. 目标答案只在后端保存。
2. 每次提交由后端判定。
3. attempt 必须属于当前用户。
4. completedAt 由服务端生成。
5. durationMs 由服务端计算。
6. errorCount 由服务端维护。
7. 已正确区域不能重复提交。
8. 完成后的 attempt 不能再次提交。
9. submit 接口限流。
10. 请求坐标数量限制。
11. 不接受前端提交的 durationMs 作为排名依据。

### 17.3 限流建议

提交接口：

```txt
POST /api/games/life-game/attempts/:attemptId/regions/:regionId/submit
```

限流：

```txt
30 requests / minute / user
```

如果同一 attempt 错误次数过多，例如超过 100 次：

```txt
status = INVALID
invalidReason = TOO_MANY_ERRORS
```

MVP 可先设置：

```ts
const LIFE_MAX_ERROR_COUNT = 100;
```

---

## 18. UI 视觉规范

生命游戏视觉应体现：

```txt
细胞自动机
环屏
推演
稳定形态
科技感
```

推荐颜色：

```txt
Alive Cell: #facc15 / yellow
Dead Cell: #2f3545 / gray
Target Region Border: var(--sb-primary)
Correct Region: success green
Incorrect Feedback: danger red
```

### 18.1 全局棋盘

120×15 棋盘非常宽，适合做成横向环屏视觉：

```txt
宽屏矩形
小格子
目标区域边框高亮
非目标区域保持低对比
```

桌面端：

```css
.life-full-board {
  width: 100%;
  aspect-ratio: 8 / 1;
  display: grid;
  grid-template-columns: repeat(120, 1fr);
  grid-template-rows: repeat(15, 1fr);
  gap: 1px;
}
```

移动端：

```txt
允许横向缩放或横向滚动观察
目标区域编辑器不横向滚动
```

### 18.2 目标区域编辑器

10×15 网格，格子更大：

```css
.life-region-editor {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(15, 1fr);
  gap: 3px;
}
```

要求：

1. 每个格子可点击。
2. 存活状态用黄色。
3. 死亡状态用灰色。
4. hover / active 有明显反馈。
5. 已正确区域锁定并显示 correct 状态。

---

## 19. 结果弹窗

全部目标区域正确后显示：

```txt
┌──────────────────────────────┐
│ Challenge Complete            │
│                              │
│ 生命游戏 · 标准               │
│                              │
│ Time          03:42           │
│ Errors        2               │
│ Regions       2 / 2           │
│ Stable Gen    37              │
│ Rank          #12             │
│                              │
│ [再玩一次] [查看排行榜]        │
└──────────────────────────────┘
```

如果刷新个人最佳：

```txt
New Personal Best
```

---

## 20. 游戏规则说明文案

详情页规则说明：

```txt
在生命游戏中，每个格子的下一代状态由周围 8 个邻居决定。
灰格代表死亡，黄格代表存活。

规则为 B3/S23：
- 死亡细胞周围恰好有 3 个存活细胞时，将在下一代诞生。
- 存活细胞周围有 2 或 3 个存活细胞时，将继续存活。
- 其他情况，该格在下一代为死亡。

你需要观察 120×15 初始网格，推理若干目标区域在稳定状态下的存活细胞位置。
每个目标区域可以单独提交。系统会提示该区域是否正确。
最终排名优先比较完成用时，其次比较错误次数。
```

游戏页短规则：

```txt
根据 B3/S23 规则推演稳定状态，在目标区域中标出最终存活细胞。
```

---

## 21. 测试要求

### 21.1 Game Engine 单元测试

必须覆盖：

1. 死亡细胞恰好 3 个邻居时变为存活。
2. 存活细胞 2 个邻居时继续存活。
3. 存活细胞 3 个邻居时继续存活。
4. 存活细胞少于 2 个邻居时死亡。
5. 存活细胞多于 3 个邻居时死亡。
6. 水平方向 wrapX 生效。
7. 垂直方向 wrapY=false 时不环绕。
8. `stepLife` 输出符合预期。
9. `simulateUntilStable` 能检测 fixed point。
10. `simulateUntilStable` 能检测 oscillator。
11. `extractRegionAnswer` 正确提取局部坐标。
12. `isSameLocalCellSet` 忽略顺序。
13. 重复坐标判非法。
14. 越界坐标判非法。

---

### 21.2 后端测试

必须覆盖：

1. start easy 返回 1 个目标区域。
2. start normal 返回 2 个目标区域。
3. start hard 返回 3 个目标区域。
4. start response 不包含 stableState。
5. start response 不包含 targetAnswers。
6. 正确提交区域后返回 correct=true。
7. 错误提交区域后 errorCount +1。
8. 已正确区域不能重复提交。
9. 非目标区域不能提交。
10. 所有目标区域正确后 attempt completed。
11. completed 后更新排行榜。
12. 排行榜按 durationMs ASC、errorCount ASC 排序。
13. 未登录不能 start 和 submit。
14. 其他用户不能提交不属于自己的 attempt。
15. completed attempt 不能继续 submit。

---

### 21.3 前端测试

必须覆盖：

1. 游戏详情页展示生命游戏元信息。
2. 难度切换影响目标区域数量说明和排行榜。
3. start 后渲染 120×15 初始棋盘。
4. 目标区域 tab 数量符合难度。
5. 点击目标区域格子可以切换 alive/dead。
6. 正确提交后区域锁定。
7. 错误提交后 errorCount 更新。
8. 全部正确后显示结果弹窗。
9. 移动端目标区域编辑器可操作。
10. 页面刷新后能恢复 attempt 状态。

---

## 22. 验收标准

完成后必须满足：

1. `/games/life-game` 可以看到《生命游戏》详情页。
2. 游戏详情页展示来源、规则、能力维度、难度选择和排行榜。
3. 三种难度分别对应 1、2、3 个目标区域。
4. 点击开始挑战后进入 `/games/life-game/play`。
5. 游戏页展示 120×15 初始细胞分布。
6. 目标区域被清晰标注。
7. 玩家可以在 10×15 目标区域编辑器中填写答案。
8. 玩家可以分别提交每个目标区域。
9. 每次提交后系统提示该区域正确或错误。
10. 错误提交会增加错误次数。
11. 正确提交会锁定该区域。
12. 所有目标区域正确后游戏结束。
13. 服务端记录完成时间和错误次数。
14. 排行榜按用时优先、错误次数其次排序。
15. 不同难度有独立排行榜。
16. 前端无法获得稳定状态答案。
17. 页面刷新后能够恢复当前 attempt 的已完成区域和错误次数。
18. 新游戏接入不破坏现有数字华容道和通用游戏页面。
19. 移动端可正常观察初始棋盘并编辑目标区域。
20. 所有核心 engine、API、前端交互测试通过。

---

## 23. 后续扩展方向

### 23.1 更强题库管理

后续可以增加：

1. 管理员上传初始图案。
2. 自动推演稳定状态。
3. 选择目标区域。
4. 预览答案。
5. 设置题目难度分。
6. 禁用不合格题目。

### 23.2 过程辅助

可选功能：

1. 显示坐标轴。
2. 高亮目标区域边界。
3. 放大目标区域初始状态。
4. 支持草稿标记。
5. 支持撤销 / 重做。
6. 支持隐藏非目标区域。

### 23.3 更复杂排行榜

可扩展：

1. 日榜。
2. 周榜。
3. 零错误榜。
4. 按目标区域数量分榜。
5. 按题目复杂度分榜。

---

## 24. Claude Code 实现顺序

### Step 1：注册游戏元信息

1. 在游戏 seed 中新增 `life-game`。
2. 新增三档 difficulty。
3. 新增三个 leaderboard definitions。

### Step 2：实现 game-engine

1. 新增 `packages/game-engine/src/life-game`。
2. 实现 regions。
3. 实现 B3/S23 step。
4. 实现 simulateUntilStable。
5. 实现 region answer extraction。
6. 实现 submission validator。
7. 编写单元测试。

### Step 3：数据库迁移

1. 新增 `LifePuzzle`。
2. 新增 `LifeRegionSubmission`。
3. 如有必要，给 `GameAttempt` 新增 `metadata`。
4. 添加 seed puzzles。

### Step 4：后端 API

1. 实现 LifeGameAdapter start。
2. 实现 submit region endpoint。
3. 实现 get attempt。
4. 实现 abandon attempt。
5. 接入 leaderboard service。
6. 添加 API 测试。

### Step 5：前端页面

1. 注册 `life-game` 到 webGameRegistry。
2. 实现详情页展示。
3. 实现 LifeGamePlayPage。
4. 实现 LifeInitialBoard。
5. 实现 LifeRegionAnswerEditor。
6. 实现提交反馈。
7. 实现 Result Modal。
8. 实现移动端布局。

### Step 6：联调验收

1. easy 完整通关。
2. normal 完整通关。
3. hard 完整通关。
4. 错误提交计数正确。
5. 排行榜排序正确。
6. 刷新恢复 attempt 正确。
7. 前端无法看到答案。
