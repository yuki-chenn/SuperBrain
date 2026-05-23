# SuperBrain 新增游戏需求设计文档：《精准造字》

> 游戏来源：最强大脑第十三季第二期  
> 游戏类型：汉字结构重组 / 字根识别 / 路径规划 / 规则推理  
> 目标：在现有 SuperBrain 多游戏平台中新增《精准造字》，支持 6×6 文字池、6 个初始部首池、每回合 4 次造字、部首冷却、路径推进、全格点亮、错误提交、计时排行榜和可扩展题库。

---

## 1. 游戏概述

《精准造字》是一个基于汉字构形规律的推理型游戏。

每位玩家面前有一个：

```txt
6 × 6 文字池
```

每个格子里存放一个待激活的汉字字根。玩家同时拥有一个初始部首池：

```txt
6 个部首
```

每一回合中，玩家需要从部首池中选择 4 个部首。部首允许重复选择。玩家再从当前可选位置出发，依次选择 4 个文字池格子，将 4 个部首分别与这 4 个格子中的字根组合，构造出 4 个有效汉字。

如果 4 个组合全部有效，则本回合成功：

1. 对应的 4 个格子被点亮。
2. 玩家位置移动到本回合最后一个格子。
3. 本回合使用过的部首在下一回合暂时禁用。
4. 进入下一回合。

当玩家成功点亮 6×6 文字池中的全部 36 个格子时，挑战成功。

---

## 2. 关键规则解释与产品化约定

原节目规则中存在一句：

```txt
选手可以自由选择任意格子作为起点……选手将从当前格子的位置继续前进
```

为了在 Web 游戏中形成明确、可判定、可扩展的玩法，MVP 采用以下规则解释。

### 2.1 起点规则

第一回合开始前，玩家可以从 6×6 文字池中选择任意未点亮格子作为本局起点。

### 2.2 回合路径规则

每回合玩家需要选择 4 个未点亮格子，形成一个长度为 4 的路径。

路径要求：

1. 第一回合的第一个格子可以是任意未点亮格子。
2. 非第一回合的第一个格子必须与上一回合结束位置相邻。
3. 同一回合内，后一个格子必须与前一个格子相邻。
4. 相邻关系采用 4 邻接：仅允许上、下、左、右移动。
5. 同一回合不能重复选择同一个格子。
6. 已点亮格子不能再次选择。

采用 4 邻接的原因：

1. 规则更直观，玩家更容易理解与规划路径。
2. 更强调路径连续性与局部决策。
3. 前后端校验更统一，减少边界分歧。

当前版本固定为 4 邻接，不启用 8 邻接。

```ts
export type AdjacencyMode = "ORTHOGONAL_4" | "KING_8";
```

MVP 默认：

```ts
const DEFAULT_ADJACENCY_MODE: AdjacencyMode = "ORTHOGONAL_4";
```

### 2.3 部首选择规则

每回合从 6 个初始部首池中选择 4 个部首。

规则：

1. 部首可以重复选择。
2. 当前回合已使用过的部首，在下一回合暂时禁用。
3. “已使用过的部首”按部首种类计算，而不是按选择次数计算。
4. 被暂时禁用的部首只禁用 1 回合。
5. 禁用结束后，该部首重新可选。

示例：

```txt
初始部首池：氵、亻、扌、木、口、忄

第 1 回合选择：氵、氵、木、口
第 2 回合禁用：氵、木、口
第 2 回合可选：亻、扌、忄
```

这里存在一个问题：第 2 回合可选部首只有 3 个，但一回合需要选择 4 个。由于规则允许重复选择，所以玩家可以从这 3 个可选部首中重复选择 4 次，例如：

```txt
亻、扌、忄、亻
```

### 2.4 部首与字根组合规则

每个待激活字根都可以与若干部首组合成有效汉字。

示例：

```txt
字根：青
部首：氵 → 清
部首：忄 → 情
部首：日 → 晴
部首：讠 → 请
部首：目 → 睛
```

一次组合由以下三部分决定：

```txt
部首 + 字根 + 结构模式 = 新字
```

结构模式包括：

```txt
LEFT_RIGHT      左右结构，例如 氵 + 青 = 清
TOP_BOTTOM      上下结构，例如 艹 + 化 = 花
SURROUND        包围结构，例如 门 + 日 = 间
SEMI_SURROUND   半包围结构，例如 辶 + 元 = 远
OVERLAY         嵌套或特殊结构，MVP 少用
```

MVP 为了降低题库构建复杂度，优先支持：

```txt
LEFT_RIGHT
TOP_BOTTOM
SEMI_SURROUND
SURROUND
```

---

## 3. 游戏目标

玩家目标：

```txt
在尽可能短的时间内，用尽可能少的错误次数，点亮全部 36 个文字池格子。
```

挑战成功条件：

1. 36 个格子全部点亮。
2. 最后一回合提交成功。
3. 服务端确认所有组合有效。

排行榜排序：

```txt
1. 总用时 durationMs ASC
2. 错误次数 errorCount ASC
3. 完成时间 completedAt ASC
```

---

## 4. 游戏难度设计

设置 3 种难度。

| 难度 key | 名称 | 题目特征 | 路径约束 | 字根复杂度 | 推荐对象 |
|---|---|---|---|---|---|
| `easy` | 入门 | 高频字根，组合直观 | 4 邻接 | 简单左右结构为主 | 初次体验 |
| `normal` | 标准 | 常见字根 + 少量混淆 | 4 邻接 | 左右/上下/半包围混合 | 默认推荐 |
| `hard` | 挑战 | 多义字根、强干扰 | 4 邻接，可提高路径约束 | 多结构、多候选组合 | 高阶玩家 |

难度变量：

```ts
interface CharacterBuildDifficultyConfig {
  key: "easy" | "normal" | "hard";
  label: string;
  boardSize: 6;
  cellsToLight: 36;
  picksPerRound: 4;
  radicalPoolSize: 6;
  adjacencyMode: "ORTHOGONAL_4";
  maxWrongSubmissions?: number;
  rootComplexity: "LOW" | "MEDIUM" | "HIGH";
  allowedStructures: CharacterStructure[];
  decoyRatio: number;
}
```

推荐配置：

```ts
export const PRECISE_CHARACTER_BUILD_DIFFICULTIES = [
  {
    key: "easy",
    label: "入门",
    boardSize: 6,
    cellsToLight: 36,
    picksPerRound: 4,
    radicalPoolSize: 6,
    adjacencyMode: "ORTHOGONAL_4",
    maxWrongSubmissions: 100,
    rootComplexity: "LOW",
    allowedStructures: ["LEFT_RIGHT", "TOP_BOTTOM"],
    decoyRatio: 0.1,
  },
  {
    key: "normal",
    label: "标准",
    boardSize: 6,
    cellsToLight: 36,
    picksPerRound: 4,
    radicalPoolSize: 6,
    adjacencyMode: "ORTHOGONAL_4",
    maxWrongSubmissions: 100,
    rootComplexity: "MEDIUM",
    allowedStructures: ["LEFT_RIGHT", "TOP_BOTTOM", "SEMI_SURROUND"],
    decoyRatio: 0.25,
    recommended: true,
  },
  {
    key: "hard",
    label: "挑战",
    boardSize: 6,
    cellsToLight: 36,
    picksPerRound: 4,
    radicalPoolSize: 6,
    adjacencyMode: "ORTHOGONAL_4",
    maxWrongSubmissions: 100,
    rootComplexity: "HIGH",
    allowedStructures: ["LEFT_RIGHT", "TOP_BOTTOM", "SEMI_SURROUND", "SURROUND"],
    decoyRatio: 0.4,
  },
] as const;
```

---

## 5. 汉字字根与部首设计

## 5.1 数据设计原则

《精准造字》的关键不是随机拼字，而是基于可验证的汉字构形知识库。

因此需要维护一个结构化字库：

```txt
部首 Radical
字根 Root
组合 Combination
目标汉字 Character
结构模式 Structure
```

每个有效组合都必须来自题库，不允许简单字符串拼接判断。

原因：

1. 汉字组合存在大量非线性结构，不能用 Unicode 拼接解决。
2. 同一个部首在不同位置形态不同，例如：水 → 氵，心 → 忄，手 → 扌。
3. 同一个字根可以与多个部首组合成不同字。
4. 一些组合在视觉上成立，但不是现代通用汉字，应由题库控制。
5. 需要控制难度和干扰项。

---

## 5.2 部首池候选

MVP 推荐优先使用高频、组合稳定、可形成大量常见字的部首。

### 5.2.1 高频左右结构部首

| 部首 key | 显示 | 语义 | 常见位置 | 示例组合 |
|---|---|---|---|---|
| `water` | 氵 | 水 | 左 | 清、河、湖、海、洋、洗、消 |
| `person` | 亻 | 人 | 左 | 你、他、休、体、住、位、信 |
| `hand` | 扌 | 手 | 左 | 打、拍、拉、推、持、指、换 |
| `heart` | 忄 | 心 | 左 | 情、怕、快、慢、忆、怀 |
| `mouth` | 口 | 口 | 左/外 | 吗、听、呼、叫、响、喝 |
| `speech` | 讠 | 言 | 左 | 说、话、请、讲、认、识 |
| `wood` | 木 | 木 | 左/下 | 林、树、枝、机、村、板 |
| `fire` | 火 | 火 | 左/下 | 灯、烧、烟、炒、炎、秋 |
| `sun` | 日 | 日 | 左/上 | 明、晴、时、晚、昨、星 |
| `eye` | 目 | 目 | 左 | 睛、眼、看、盼、睡 |
| `foot` | 足 | 足 | 左 | 跑、跳、路、跟、踢 |
| `metal` | 钅 | 金 | 左 | 钟、铁、银、钱、针、钢 |
| `food` | 饣 | 食 | 左 | 饭、饮、饱、馆、饿 |
| `thread` | 纟 | 丝 | 左 | 线、细、红、绿、纸、给 |
| `clothes` | 衤 | 衣 | 左 | 补、被、裤、袜、衫 |
| `insect` | 虫 | 虫 | 左 | 蚁、虾、蛇、蛙、蜂 |
| `vehicle` | 车 | 车 | 左 | 轮、转、轻、辆、输 |
| `horse` | 马 | 马 | 左 | 驰、驶、验、骑、骗 |
| `land` | 土 | 土 | 左 | 地、场、城、坏、坡 |
| `king` | 王 | 玉 | 左 | 玩、珍、珠、理、班 |

### 5.2.2 上下结构部首

| 部首 key | 显示 | 语义 | 常见位置 | 示例组合 |
|---|---|---|---|---|
| `grass` | 艹 | 草木 | 上 | 花、草、茶、苦、药、英 |
| `bamboo` | ⺮ | 竹 | 上 | 笑、笔、答、等、简、箱 |
| `rain` | 雨 | 雨 | 上 | 雪、雷、雾、霜、露 |
| `hole` | 穴 | 穴 | 上 | 空、穿、突、窗、窄 |
| `disease` | 疒 | 病 | 外/上左 | 病、痛、疼、疯、痕 |
| `roof` | 宀 | 宀 | 上 | 安、家、字、完、定 |
| `cover` | 冖 | 覆盖 | 上 | 军、冠、写、冤 |
| `heart_bottom` | 心 | 心 | 下 | 想、念、忘、急、总 |
| `fire_bottom` | 灬 | 火 | 下 | 热、然、照、煮、熟 |
| `dish` | 皿 | 器皿 | 下 | 盆、盒、盛、监 |

### 5.2.3 半包围 / 包围结构部首

| 部首 key | 显示 | 类型 | 示例组合 |
|---|---|---|---|
| `walk` | 辶 | 半包围 | 过、远、近、还、进、送 |
| `door` | 门 | 包围 | 问、间、闻、闪、闲、闷 |
| `enclosure` | 囗 | 全包围 | 国、园、团、困、围 |
| `factory` | 厂 | 半包围 | 压、原、厅、历、厉 |
| `wide` | 广 | 半包围 | 床、店、府、度、座 |
| `corpse` | 尸 | 半包围 | 居、屋、层、展、属 |
| `tiger` | 虍 | 半包围 | 虎、虑、虚、虐 |
| `cliff` | 山 | 上/外 | 岩、岸、峰、岭 |

---

## 5.3 字根候选设计

字根是文字池中显示的待激活元素。字根应该满足：

1. 本身可以是独体字、声旁、形旁或可识别构件。
2. 能与多个部首形成有效汉字。
3. 视觉识别清楚。
4. 在不同难度中可控制复杂度。

### 5.3.1 入门级字根 LOW

| 字根 key | 显示 | 可组合示例 |
|---|---|---|
| `qing` | 青 | 清、情、晴、请、睛 |
| `ma` | 马 | 吗、妈、码、蚂 |
| `mu` | 木 | 沐、休、林、困 |
| `ke` | 可 | 河、何、柯、呵 |
| `fang` | 方 | 放、访、防、房 |
| `yuan` | 元 | 远、园、玩、沅 |
| `hua` | 化 | 花、华、货 |
| `li` | 里 | 理、狸、哩、鲤 |
| `dong` | 东 | 冻、栋、陈、鸫 |
| `bai` | 白 | 伯、拍、柏、泊、怕 |
| `zhu` | 主 | 住、注、驻、柱 |
| `bao` | 包 | 饱、抱、泡、跑、炮 |
| `shi` | 十 | 叶、计、汁、什 |
| `men_inner` | 日 | 间、明、阳、晴 |
| `guo_inner` | 玉 | 国、宝、莹 |

### 5.3.2 标准级字根 MEDIUM

| 字根 key | 显示 | 可组合示例 |
|---|---|---|
| `xiang` | 相 | 想、箱、湘、厢 |
| `jing` | 京 | 惊、景、凉、鲸 |
| `guan` | 官 | 管、馆、棺 |
| `liang` | 良 | 浪、娘、粮、狼 |
| `zhao` | 召 | 招、绍、昭、沼 |
| `zheng` | 正 | 征、证、政、症 |
| `cheng` | 成 | 城、诚、盛 |
| `jian` | 见 | 现、观、舰、砚 |
| `ping` | 平 | 评、坪、苹、萍 |
| `gu` | 古 | 故、姑、估、苦、固 |
| `you` | 由 | 邮、油、抽、迪、袖 |
| `liang2` | 两 | 辆、俩、满 |
| `xian` | 先 | 洗、选、铣、筅 |
| `cai` | 才 | 材、财、闭、豺 |
| `sheng` | 生 | 星、姓、性、牲 |
| `ming` | 名 | 茗、铭、酩 |

### 5.3.3 挑战级字根 HIGH

| 字根 key | 显示 | 可组合示例 |
|---|---|---|
| `qian` | 佥 | 检、捡、脸、险、验 |
| `jian_root` | 兼 | 嫌、赚、谦、歉、廉 |
| `shu` | 俞 | 输、愉、偷、榆、渝 |
| `cang` | 仓 | 苍、沧、抢、枪、舱 |
| `man` | 曼 | 慢、漫、蔓、馒、幔 |
| `xi` | 希 | 稀、烯、郗 |
| `ling` | 令 | 冷、领、铃、岭、怜 |
| `lun` | 仑 | 论、轮、伦、沦、纶 |
| `mo` | 莫 | 模、摸、漠、膜、寞 |
| `jin` | 今 | 念、吟、矜、岑 |
| `fu` | 甫 | 辅、铺、捕、浦、哺 |
| `yao` | 尧 | 烧、浇、绕、晓、挠 |
| `duan` | 段 | 锻、缎、椴 |
| `zhuan` | 专 | 传、转、砖 |
| `ding` | 丁 | 订、钉、灯、盯、厅 |
| `ang` | 央 | 英、映、秧、殃 |

注意：以上字根表是 MVP 候选，不等同于完整汉字构件学标准。实际题库必须以人工校验过的 `CharacterCombination` 表为准。

---

## 5.4 有效组合表设计

有效造字不能动态猜测，必须查表。

```ts
export interface CharacterCombination {
  id: string;

  radicalKey: string;
  radicalGlyph: string;

  rootKey: string;
  rootGlyph: string;

  resultChar: string;
  pinyin?: string;
  meaningHint?: string;

  structure: CharacterStructure;

  difficulty: "easy" | "normal" | "hard";

  frequencyLevel: "HIGH" | "MEDIUM" | "LOW";

  enabled: boolean;
}
```

结构类型：

```ts
export type CharacterStructure =
  | "LEFT_RIGHT"
  | "TOP_BOTTOM"
  | "SURROUND"
  | "SEMI_SURROUND"
  | "SPECIAL";
```

示例组合数据：

```ts
const CHARACTER_COMBINATIONS: CharacterCombination[] = [
  {
    id: "water-qing-qing",
    radicalKey: "water",
    radicalGlyph: "氵",
    rootKey: "qing",
    rootGlyph: "青",
    resultChar: "清",
    pinyin: "qīng",
    structure: "LEFT_RIGHT",
    difficulty: "easy",
    frequencyLevel: "HIGH",
    enabled: true,
  },
  {
    id: "heart-qing-qing",
    radicalKey: "heart",
    radicalGlyph: "忄",
    rootKey: "qing",
    rootGlyph: "青",
    resultChar: "情",
    pinyin: "qíng",
    structure: "LEFT_RIGHT",
    difficulty: "easy",
    frequencyLevel: "HIGH",
    enabled: true,
  },
  {
    id: "speech-qing-qing",
    radicalKey: "speech",
    radicalGlyph: "讠",
    rootKey: "qing",
    rootGlyph: "青",
    resultChar: "请",
    pinyin: "qǐng",
    structure: "LEFT_RIGHT",
    difficulty: "easy",
    frequencyLevel: "HIGH",
    enabled: true,
  },
  {
    id: "walk-yuan-yuan",
    radicalKey: "walk",
    radicalGlyph: "辶",
    rootKey: "yuan",
    rootGlyph: "元",
    resultChar: "远",
    pinyin: "yuǎn",
    structure: "SEMI_SURROUND",
    difficulty: "easy",
    frequencyLevel: "HIGH",
    enabled: true,
  },
  {
    id: "door-ri-jian",
    radicalKey: "door",
    radicalGlyph: "门",
    rootKey: "ri",
    rootGlyph: "日",
    resultChar: "间",
    pinyin: "jiān",
    structure: "SURROUND",
    difficulty: "easy",
    frequencyLevel: "HIGH",
    enabled: true,
  }
];
```

---

## 6. 题目结构设计

## 6.1 Puzzle 定义

一局题目由以下内容组成：

```ts
export interface PreciseCharacterPuzzle {
  id: string;
  difficultyKey: "easy" | "normal" | "hard";

  boardSize: 6;

  radicalPool: Radical[]; // 6 个部首

  cells: CharacterCell[]; // 36 个格子

  solutionRounds: SolutionRound[];

  config: {
    picksPerRound: 4;
    adjacencyMode: AdjacencyMode;
    cooldownRounds: 1;
    allowRadicalRepeatInRound: true;
  };

  metadata: {
    source: string;
    createdBy: "manual" | "generated";
    complexityScore: number;
    notes?: string;
  };
}
```

## 6.2 Cell 定义

```ts
export interface CharacterCell {
  index: number; // 0 - 35
  row: number;   // 0 - 5
  col: number;   // 0 - 5

  rootKey: string;
  rootGlyph: string;

  // 可选：用于前端 hint 或题库审核，不直接给玩家
  validCombinationIds?: string[];
}
```

## 6.3 Radical 定义

```ts
export interface Radical {
  key: string;
  glyph: string;
  label: string;
  category:
    | "LEFT"
    | "TOP"
    | "BOTTOM"
    | "SURROUND"
    | "SEMI_SURROUND";
}
```

## 6.4 SolutionRound 定义

服务端内部答案。

```ts
export interface SolutionRound {
  roundIndex: number;

  // 该回合的 4 个格子路径
  path: Array<{
    cellIndex: number;
    row: number;
    col: number;
  }>;

  // 与 path 一一对应
  radicalKeys: string[];

  // 与 path 一一对应
  resultChars: string[];

  combinationIds: string[];
}
```

注意：

1. `solutionRounds` 不返回前端。
2. 前端只能看到 board cells 和 radicalPool。
3. 后端用 solution 或组合表校验玩家提交。

---

## 7. 回合状态设计

## 7.1 Attempt 状态

```ts
export interface PreciseCharacterAttemptState {
  attemptId: string;
  userId: string;
  puzzleId: string;
  gameSlug: "precise-character-building";
  difficultyKey: "easy" | "normal" | "hard";

  status: "STARTED" | "COMPLETED" | "ABANDONED" | "INVALID";

  startedAt: string;
  completedAt?: string;

  currentRoundIndex: number;

  currentPosition?: {
    row: number;
    col: number;
    cellIndex: number;
  };

  litCellIndices: number[];

  disabledRadicalKeys: string[]; // 上一回合使用过的部首种类

  errorCount: number;

  roundHistory: RoundSubmissionResult[];

  metrics?: {
    durationMs: number;
    errorCount: number;
    rounds: number;
    litCells: number;
  };
}
```

## 7.2 Round Draft 前端状态

前端本地维护当前回合草稿：

```ts
export interface CurrentRoundDraft {
  selectedRadicals: Array<{
    radicalKey: string;
    slotIndex: number; // 0 - 3
  }>;

  selectedCells: Array<{
    cellIndex: number;
    row: number;
    col: number;
    slotIndex: number; // 0 - 3，与 selectedRadicals 一一对应
  }>;
}
```

重要：

```txt
selectedRadicals[0] 与 selectedCells[0] 组合
selectedRadicals[1] 与 selectedCells[1] 组合
selectedRadicals[2] 与 selectedCells[2] 组合
selectedRadicals[3] 与 selectedCells[3] 组合
```

---

## 8. 具体游戏逻辑流程

## 8.1 开始游戏

用户进入游戏页并选择难度后，点击开始挑战。

前端请求：

```txt
POST /api/games/precise-character-building/attempts/start
```

后端执行：

1. 校验用户登录。
2. 根据 difficultyKey 选择一套可用 puzzle。
3. 创建 GameAttempt。
4. 初始化：
   - `currentRoundIndex = 0`
   - `litCellIndices = []`
   - `disabledRadicalKeys = []`
   - `errorCount = 0`
   - `currentPosition = null`
5. 返回给前端：
   - attemptId
   - board cells
   - radicalPool
   - config
   - startedAt
   - 当前可用部首

后端不能返回：

```txt
solutionRounds
combinationIds
resultChars
完整有效组合表
```

---

## 8.2 玩家选择部首

每回合需要选择 4 个部首 slot：

```txt
Slot 1
Slot 2
Slot 3
Slot 4
```

规则：

1. 每个 slot 必须选择一个部首。
2. 部首可以重复。
3. 被禁用的部首不能选择。
4. 如果重复选择同一个部首，则它占用多个 slot。

示例：

```txt
Slot 1: 氵
Slot 2: 氵
Slot 3: 木
Slot 4: 口
```

前端表现：

1. 部首池展示 6 个部首按钮。
2. 禁用部首置灰，并显示“本回合禁用”。
3. 玩家点击部首后，填入当前待选择 slot。
4. 玩家可以清空某个 slot 重新选。

---

## 8.3 玩家选择路径格子

每回合需要选择 4 个格子，与 4 个部首 slot 一一对应。

路径选择规则：

### 第一个格子

如果 `currentPosition = null`，即第一回合：

```txt
任意未点亮格子可选
```

否则：

```txt
必须与 currentPosition 相邻
```

### 后续格子

```txt
必须与上一个已选格子相邻
```

### 所有格子

必须满足：

1. 未点亮。
2. 本回合未重复选择。
3. 在棋盘范围内。
4. 符合相邻规则。

---

## 8.4 回合提交

当玩家选择完 4 个部首和 4 个格子后，可以点击：

```txt
提交本回合
```

提交请求：

```ts
interface SubmitPreciseCharacterRoundRequest {
  selectedRadicalKeys: string[]; // length = 4
  selectedCellIndices: number[]; // length = 4
}
```

后端校验步骤：

1. 校验 attempt 属于当前用户。
2. 校验 attempt.status = STARTED。
3. 校验 selectedRadicalKeys 长度为 4。
4. 校验 selectedCellIndices 长度为 4。
5. 校验每个部首来自 puzzle.radicalPool。
6. 校验没有使用 disabledRadicalKeys 中的部首。
7. 校验部首允许重复。
8. 校验每个 cellIndex 在 0-35 范围内。
9. 校验 cell 未点亮。
10. 校验同一回合 cell 不重复。
11. 校验路径与 currentPosition 连续。
12. 对 4 个 slot 分别查组合表：
    - radicalKey + cell.rootKey 是否存在 enabled combination。
13. 如果 4 个组合全部有效：回合成功。
14. 如果任意一个组合无效：回合失败。

---

## 8.5 回合成功处理

如果 4 个组合全部有效：

后端更新：

1. 将 4 个 cellIndex 加入 `litCellIndices`。
2. 更新 `currentPosition` 为本回合第 4 个格子。
3. 更新 `disabledRadicalKeys` 为本回合使用过的部首去重集合。
4. `currentRoundIndex += 1`。
5. 保存 roundHistory，包含：
   - selectedRadicalKeys
   - selectedCellIndices
   - resultChars
   - combinationIds
   - correct = true
6. 如果 litCellIndices 数量达到 36：
   - attempt.status = COMPLETED
   - completedAt = now
   - durationMs = completedAt - startedAt
   - 更新排行榜

前端反馈：

1. 4 个格子点亮。
2. 在格子上显示组成的新字。
3. 当前路径高亮后淡出。
4. 部首池更新禁用状态。
5. 进入下一回合。
6. 如果完成全部格子，弹出结果弹窗。

---

## 8.6 回合失败处理

如果任一组合无效，或路径不合法：

后端更新：

1. `errorCount += 1`。
2. 保存 roundHistory，包含：
   - selectedRadicalKeys
   - selectedCellIndices
   - correct = false
   - errorReason
3. 不点亮任何格子。
4. 不移动 currentPosition。
5. 不更新 disabledRadicalKeys。
6. 不进入下一回合。

前端反馈：

1. 显示“本回合重组无效”。
2. 错误次数 +1。
3. 保留当前草稿，允许玩家修改。
4. 不展示具体哪个 slot 错误，避免过度提示。

MVP 可以提供轻提示：

```txt
路径非法
部首本回合不可用
存在无法成字的组合
```

但不要直接告诉正确答案。

---

## 8.7 完成条件

当：

```txt
litCellIndices.length === 36
```

则挑战成功。

因为每回合点亮 4 格，36 格刚好需要：

```txt
36 / 4 = 9 回合
```

所以正常完成局的回合数为 9。

如果未来变更棋盘大小或每回合格子数，完成条件仍以 litCellIndices 数量为准。

---

## 9. 有效造字判定逻辑

## 9.1 单个组合判定

```ts
function validateCharacterCombination(input: {
  radicalKey: string;
  rootKey: string;
  difficultyKey: string;
}): CharacterCombination | null {
  return combinationTable.find((item) =>
    item.radicalKey === input.radicalKey &&
    item.rootKey === input.rootKey &&
    item.enabled &&
    isAllowedInDifficulty(item, input.difficultyKey)
  ) ?? null;
}
```

## 9.2 一回合判定

```ts
function validateRoundCombinations(input: {
  selectedRadicalKeys: string[];
  selectedCells: CharacterCell[];
  difficultyKey: string;
}): {
  valid: boolean;
  resultChars: string[];
  combinationIds: string[];
  invalidSlotIndex?: number;
} {
  const resultChars: string[] = [];
  const combinationIds: string[] = [];

  for (let i = 0; i < 4; i++) {
    const combo = validateCharacterCombination({
      radicalKey: input.selectedRadicalKeys[i],
      rootKey: input.selectedCells[i].rootKey,
      difficultyKey: input.difficultyKey,
    });

    if (!combo) {
      return {
        valid: false,
        resultChars: [],
        combinationIds: [],
        invalidSlotIndex: i,
      };
    }

    resultChars.push(combo.resultChar);
    combinationIds.push(combo.id);
  }

  return {
    valid: true,
    resultChars,
    combinationIds,
  };
}
```

---

## 10. 路径判定逻辑

坐标转换：

```ts
function indexToCoord(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / 6),
    col: index % 6,
  };
}
```

（可选）8 邻接（当前版本未启用）：

```ts
function isAdjacent8(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);

  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}
```

4 邻接：

```ts
function isAdjacent4(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);

  return dr + dc === 1;
}
```

路径校验：

```ts
function validateRoundPath(input: {
  currentPosition: Coord | null;
  selectedCellIndices: number[];
  litCellIndices: number[];
  adjacencyMode: AdjacencyMode;
}): {
  valid: boolean;
  reason?: string;
} {
  if (input.selectedCellIndices.length !== 4) {
    return { valid: false, reason: "INVALID_PATH_LENGTH" };
  }

  const seen = new Set<number>();
  const lit = new Set(input.litCellIndices);

  for (const index of input.selectedCellIndices) {
    if (index < 0 || index >= 36) {
      return { valid: false, reason: "CELL_OUT_OF_RANGE" };
    }

    if (seen.has(index)) {
      return { valid: false, reason: "DUPLICATED_CELL_IN_ROUND" };
    }

    if (lit.has(index)) {
      return { valid: false, reason: "CELL_ALREADY_LIT" };
    }

    seen.add(index);
  }

  const coords = input.selectedCellIndices.map(indexToCoord);

  if (input.currentPosition) {
    const first = coords[0];
    if (!isAdjacent(input.currentPosition, first, input.adjacencyMode)) {
      return { valid: false, reason: "FIRST_CELL_NOT_ADJACENT" };
    }
  }

  for (let i = 1; i < coords.length; i++) {
    if (!isAdjacent(coords[i - 1], coords[i], input.adjacencyMode)) {
      return { valid: false, reason: "PATH_BROKEN" };
    }
  }

  return { valid: true };
}
```

---

## 11. 题库生成策略

## 11.1 推荐策略：人工审核题库优先

《精准造字》不适合完全随机生成，因为：

1. 有效汉字组合需要人工校验。
2. 部首重复、冷却和路径规则会导致可解性复杂。
3. 36 个格子需要刚好 9 回合全部点亮。
4. 如果随机放字根，可能产生无解局。
5. 字根和部首必须有合理的中文认知难度。

MVP 推荐：

```txt
离线生成候选题 → 自动验证可解性 → 人工审核 → 入库
```

---

## 11.2 题库生成流程

```txt
选择难度配置
  ↓
选择 6 个部首组成 radicalPool
  ↓
从组合表中选择可用字根
  ↓
生成一条覆盖 36 格的 9 回合路径
  ↓
为每个路径 slot 分配一个部首
  ↓
根据部首找到可组合字根并填入格子
  ↓
加入干扰字根或多解候选
  ↓
验证整局至少存在一条合法解
  ↓
计算 complexityScore
  ↓
保存 puzzle
```

### 11.2.1 覆盖路径生成

生成 9 个 round，每 round 4 个格子，共 36 个格子。

要求：

1. 覆盖所有格子一次。
2. 每 round 内连续相邻。
3. round 之间首尾相邻。
4. 第一个格子任意。

本质是 6×6 棋盘上的 Hamiltonian path，然后按 4 格切分。

可使用固定路径模板，例如蛇形路径：

```txt
0  1  2  3  4  5
11 10 9  8  7  6
12 13 14 15 16 17
23 22 21 20 19 18
24 25 26 27 28 29
35 34 33 32 31 30
```

也可以生成多条变体路径。

---

## 11.3 Puzzle 可解性验证

离线验证器必须模拟 solutionRounds：

1. 初始 `litCellIndices = []`。
2. 初始 `disabledRadicalKeys = []`。
3. 每回合检查：
   - 4 个部首不在 disabledRadicalKeys 中。
   - 路径合法。
   - 4 个组合全部有效。
4. 成功后更新 lit、position、disabledRadicalKeys。
5. 9 回合后 litCellIndices = 36。

如果失败，该 puzzle 不入库。

---

## 12. 前端页面设计

## 12.1 游戏详情页

路径：

```txt
/games/precise-character-building
```

展示内容：

1. 游戏名称：精准造字
2. 来源：最强大脑第十三季第二期
3. 副标题：选择部首，重组汉字，点亮文字池
4. 能力维度：
   - 汉字结构识别
   - 逻辑推理
   - 路径规划
   - 工作记忆
5. 难度选择：入门 / 标准 / 挑战
6. 规则摘要：
   - 6×6 文字池
   - 初始 6 个部首
   - 每回合选择 4 个部首
   - 部首可重复
   - 上回合使用过的部首下一回合禁用
   - 每回合选择 4 个格子组合成字
   - 全部点亮即挑战成功
7. 当前难度排行榜 Top 5
8. 开始挑战按钮

---

## 12.2 游戏页布局

路径：

```txt
/games/precise-character-building/play
```

### 桌面端布局

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ TopNav                                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────┐ ┌──────────────────────────────┐ ┌───────────────┐ │
│ │ Game Info          │ │ Character Board              │ │ Round Panel    │ │
│ │                    │ │                              │ │               │ │
│ │ 精准造字            │ │ ┌────┬────┬────┬────┬────┬──┐ │ │ 部首选择       │ │
│ │ 标准                │ │ │ 青 │ 可 │ 元 │ 白 │ ... │ │ │ [氵] [亻]      │ │
│ │                    │ │ ├────┼────┼────┼────┼────┼──┤ │ │ [扌] [木]      │ │
│ │ Time   02:14        │ │ │ ...                          │ │               │ │
│ │ Errors 1            │ │ │                              │ │ │ Slot 1: 氵    │ │
│ │ Round  4 / 9        │ │ │                              │ │ │ Slot 2: 木    │ │
│ │ Lit    12 / 36      │ │ └──────────────────────────────┘ │ │               │ │
│ │                    │ │                              │ │ 路径选择       │ │
│ │ [重开] [退出]       │ │                              │ │ 1 → 2 → 3 → 4 │ │
│ └────────────────────┘ └──────────────────────────────┘ │ [提交本回合]   │ │
│                                                          └───────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

推荐三栏：

```txt
left panel: 240px
center board: flexible
right round panel: 340px
```

### 移动端布局

```txt
┌──────────────────────────────┐
│ 精准造字 · 标准               │
│ 02:14   Errors 1   12/36      │
│                              │
│ 6×6 Board                    │
│                              │
│ Round Panel                  │
│ Slot 1 Slot 2 Slot 3 Slot 4  │
│                              │
│ Radical Pool                 │
│ [氵] [亻] [扌] [木] [口] [忄] │
│                              │
│ [提交本回合]                 │
└──────────────────────────────┘
```

移动端要求：

1. 6×6 棋盘必须优先展示。
2. 格子足够大，适合点击。
3. 部首选择区固定在棋盘下方。
4. 当前 slot 状态清晰。
5. 不要出现横向滚动。

---

## 12.3 前端组件拆分

```txt
features/games/precise-character-building/
  PreciseCharacterPlayPage.tsx
  CharacterBoard.tsx
  CharacterCell.tsx
  RadicalPool.tsx
  RadicalSlotBar.tsx
  RoundPathBar.tsx
  RoundSubmitPanel.tsx
  CharacterBuildResultModal.tsx
  CharacterBuildRulesPanel.tsx
  hooks/
    usePreciseCharacterAttempt.ts
    useRoundDraft.ts
    useCharacterBoardSelection.ts
  utils/
    path.ts
    radicals.ts
    format.ts
```

复用通用组件：

```txt
GamePlayLayout
GameInfoPanel
GameHud
GameStage
GameControlBar
LeaderboardPreview
```

---

## 13. 前端交互细节

## 13.1 部首选择交互

界面显示：

```txt
当前回合部首：
[Slot 1] [Slot 2] [Slot 3] [Slot 4]

部首池：
[氵] [亻] [扌] [木] [口] [忄]
```

交互规则：

1. 点击部首，填入当前空 slot。
2. 如果所有 slot 已满，点击部首替换当前激活 slot。
3. 点击 slot 可以设为激活 slot。
4. 点击 slot 的清除按钮可以清空。
5. 禁用部首不可点击。
6. 重复选择同一可用部首允许。

## 13.2 格子选择交互

格子状态：

| 状态 | 视觉 |
|---|---|
| 未点亮 | 白底/浅灰，显示字根 |
| 已选择 | 蓝色描边，显示序号 1-4 |
| 当前可选 | 轻微高亮 |
| 不可选 | 降低透明度 |
| 已点亮 | 金色或绿色，显示重组后的新字 |
| 路径非法 | 红色短暂反馈 |

点击格子逻辑：

1. 如果格子已点亮，不可选。
2. 如果已经在当前回合路径中，再次点击可取消该格及其之后的路径。
3. 如果是下一个合法位置，加入路径。
4. 如果不合法，给出轻反馈但不增加错误次数。
5. 错误次数只由服务端提交失败增加。

## 13.3 提交按钮状态

提交按钮只有在以下条件满足时可用：

```txt
selectedRadicals.length === 4
selectedCells.length === 4
本地路径检查通过
```

按钮文案：

```txt
提交本回合
```

提交中：

```txt
验证中...
```

提交成功：

```txt
重组成功
```

提交失败：

```txt
重组无效，请调整
```

---

## 14. 后端 API 设计

## 14.1 Start Attempt

```txt
POST /api/games/precise-character-building/attempts/start
```

Request：

```ts
interface StartPreciseCharacterAttemptRequest {
  difficultyKey: "easy" | "normal" | "hard";
}
```

Response：

```ts
interface StartPreciseCharacterAttemptResponse {
  attemptId: string;
  gameSlug: "precise-character-building";
  difficultyKey: "easy" | "normal" | "hard";

  boardSize: 6;

  cells: Array<{
    index: number;
    row: number;
    col: number;
    rootKey: string;
    rootGlyph: string;
  }>;

  radicalPool: Array<{
    key: string;
    glyph: string;
    label: string;
  }>;

  config: {
    picksPerRound: 4;
    adjacencyMode: "ORTHOGONAL_4";
    cooldownRounds: 1;
    allowRadicalRepeatInRound: true;
  };

  state: {
    currentRoundIndex: 0;
    currentPosition: null;
    litCellIndices: [];
    disabledRadicalKeys: [];
    errorCount: 0;
  };

  startedAt: string;
}
```

---

## 14.2 Submit Round

```txt
POST /api/games/precise-character-building/attempts/:attemptId/rounds/submit
```

Request：

```ts
interface SubmitPreciseCharacterRoundRequest {
  selectedRadicalKeys: string[]; // length = 4
  selectedCellIndices: number[]; // length = 4
}
```

Response：

```ts
interface SubmitPreciseCharacterRoundResponse {
  correct: boolean;

  errorCount: number;

  state: {
    currentRoundIndex: number;
    currentPosition: {
      row: number;
      col: number;
      cellIndex: number;
    } | null;
    litCellIndices: number[];
    disabledRadicalKeys: string[];
  };

  roundResult?: {
    selectedCellIndices: number[];
    selectedRadicalKeys: string[];
    resultChars: string[];
  };

  attemptCompleted: boolean;

  result?: {
    durationMs: number;
    errorCount: number;
    rounds: number;
    litCells: number;
    rank?: number;
    personalBest: boolean;
  };

  errorReason?:
    | "INVALID_PATH"
    | "RADICAL_DISABLED"
    | "INVALID_COMBINATION"
    | "ATTEMPT_NOT_STARTED"
    | "CELL_ALREADY_LIT";
}
```

注意：

1. 如果 correct=false，不返回 resultChars。
2. 如果 correct=true，可以返回 resultChars，用于点亮格子显示新字。
3. 不返回未选择格子的可用组合。

---

## 14.3 Get Attempt

用于刷新页面恢复游戏状态。

```txt
GET /api/games/precise-character-building/attempts/:attemptId
```

Response：

```ts
interface GetPreciseCharacterAttemptResponse {
  attemptId: string;
  status: "STARTED" | "COMPLETED" | "ABANDONED" | "INVALID";
  difficultyKey: "easy" | "normal" | "hard";
  boardSize: 6;

  cells: Array<{
    index: number;
    row: number;
    col: number;
    rootKey: string;
    rootGlyph: string;
  }>;

  radicalPool: Array<{
    key: string;
    glyph: string;
    label: string;
  }>;

  state: {
    currentRoundIndex: number;
    currentPosition: {
      row: number;
      col: number;
      cellIndex: number;
    } | null;
    litCellIndices: number[];
    disabledRadicalKeys: string[];
    errorCount: number;
  };

  litResults: Array<{
    cellIndex: number;
    radicalKey: string;
    resultChar: string;
  }>;

  startedAt: string;
  completedAt?: string;

  metrics?: {
    durationMs: number;
    errorCount: number;
    rounds: number;
    litCells: number;
  };
}
```

---

## 14.4 Abandon Attempt

```txt
POST /api/games/precise-character-building/attempts/:attemptId/abandon
```

Response：

```ts
interface AbandonPreciseCharacterAttemptResponse {
  success: true;
}
```

---

## 15. 数据库设计

## 15.1 CharacterRadical

```prisma
model CharacterRadical {
  id        String   @id @default(cuid())
  key       String   @unique
  glyph     String
  label     String
  category  String
  enabled   Boolean  @default(true)
  metadata  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  combinations CharacterCombination[]
}
```

## 15.2 CharacterRoot

```prisma
model CharacterRoot {
  id              String   @id @default(cuid())
  key             String   @unique
  glyph           String
  complexityLevel String
  enabled         Boolean  @default(true)
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  combinations    CharacterCombination[]
}
```

## 15.3 CharacterCombination

```prisma
model CharacterCombination {
  id             String   @id @default(cuid())
  radicalId      String
  rootId         String
  resultChar     String
  pinyin         String?
  structure      String
  difficulty     String
  frequencyLevel String
  enabled        Boolean  @default(true)
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  radical        CharacterRadical @relation(fields: [radicalId], references: [id], onDelete: Cascade)
  root           CharacterRoot    @relation(fields: [rootId], references: [id], onDelete: Cascade)

  @@unique([radicalId, rootId, resultChar])
  @@index([radicalId, rootId])
  @@index([difficulty, enabled])
}
```

## 15.4 PreciseCharacterPuzzle

```prisma
model PreciseCharacterPuzzle {
  id             String   @id @default(cuid())
  difficultyKey  String
  boardSize      Int      @default(6)
  radicalPool    Json
  cells          Json
  solutionRounds Json
  config         Json
  status         String   @default("ACTIVE")
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([difficultyKey, status])
}
```

## 15.5 GameAttempt 使用

通用 `GameAttempt` 存储：

```ts
initialState: {
  boardSize: 6,
  cells: [...],
  radicalPool: [...],
  config: {...}
}

metadata: {
  puzzleId: "...",
  currentRoundIndex: 3,
  currentPosition: { row: 2, col: 4, cellIndex: 16 },
  litCellIndices: [0, 1, 2, 3, ...],
  disabledRadicalKeys: ["water", "wood"],
  litResults: [
    { cellIndex: 0, radicalKey: "water", resultChar: "清" }
  ]
}

metrics: {
  durationMs: 180000,
  errorCount: 2,
  rounds: 9,
  litCells: 36
}
```

如果没有 `metadata` 字段，需要新增：

```prisma
metadata Json @default("{}")
```

## 15.6 PreciseCharacterRoundSubmission

```prisma
model PreciseCharacterRoundSubmission {
  id                  String   @id @default(cuid())
  attemptId           String
  userId              String
  roundIndex          Int
  selectedRadicalKeys Json
  selectedCellIndices Json
  resultChars         Json?
  combinationIds      Json?
  correct             Boolean
  errorReason         String?
  submittedAt         DateTime @default(now())

  attempt             GameAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  user                User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([attemptId])
  @@index([userId])
  @@index([attemptId, roundIndex])
}
```

---

## 16. 排行榜设计

三个难度分别建榜：

```txt
precise-character-building-easy
precise-character-building-normal
precise-character-building-hard
```

LeaderboardDefinition：

```ts
{
  slug: "precise-character-building-normal",
  name: "精准造字 · 标准榜",
  gameSlug: "precise-character-building",
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

排行榜展示列：

| Rank | Player | Time | Errors | Rounds | Completed At |
|---|---|---:|---:|---:|---|

排序：

```txt
1. durationMs ASC
2. errorCount ASC
3. completedAt ASC
```

---

## 17. 安全与反作弊

后端不能返回：

```txt
solutionRounds
完整组合表
未点亮格子的有效结果
combinationIds，除非该回合已经正确提交
```

必须由服务端维护：

1. errorCount。
2. currentPosition。
3. litCellIndices。
4. disabledRadicalKeys。
5. completedAt。
6. durationMs。
7. leaderboard update。

MVP 防作弊要求：

1. attempt 必须属于当前用户。
2. attempt 只能完成一次。
3. 已点亮格子不能再次提交。
4. 禁用部首不能使用。
5. 服务端重新校验路径与组合。
6. submit 接口限流。
7. 错误次数超过阈值时可标记 INVALID。

限流建议：

```txt
POST /rounds/submit: 30 requests / minute / user
```

错误上限：

```ts
const MAX_ERROR_COUNT = 100;
```

---

## 18. 视觉设计规范

《精准造字》的视觉关键词：

```txt
汉字结构
精密拼合
文字池
点亮
理性
东方文字美学
```

建议色彩：

```txt
未点亮格子：浅灰 / 背景卡片色
已选择格子：SuperBrain primary 蓝色描边
已点亮格子：金色 / 琥珀色强调
禁用部首：灰色低透明度
错误反馈：红色短闪
成功反馈：绿色或金色
```

### 18.1 棋盘格子

```css
.character-board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 10px;
}

.character-cell {
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  border: 1px solid var(--sb-border);
  background: var(--sb-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(22px, 4vw, 38px);
  font-weight: 700;
  cursor: pointer;
}

.character-cell-selected {
  border-color: var(--sb-primary);
  box-shadow: 0 0 0 3px var(--sb-primary-soft);
}

.character-cell-lit {
  background: linear-gradient(180deg, #fde68a, #facc15);
  color: #302400;
  border-color: #eab308;
}
```

---

## 19. 规则说明文案

详情页规则文案：

```txt
在《精准造字》中，你将面对一个 6×6 的文字池。每个格子中都有一个待激活的汉字字根。

你拥有 6 个初始部首。每一回合可以从部首池中选择 4 个部首，部首允许重复选择。你还需要在文字池中选择连续的 4 个格子，将 4 个部首分别与 4 个字根组合成新的汉字。

如果 4 个组合全部有效，本回合的 4 个格子会被点亮，并显示重组后的新字。你将从本回合最后一个格子的位置继续下一回合。

注意：当前回合使用过的部首，会在下一回合暂时禁用。合理规划路径和部首使用顺序，是完成挑战的关键。

点亮全部 36 个格子即可挑战成功。排行榜优先比较完成用时，其次比较错误次数。
```

游戏页短规则：

```txt
选择 4 个可用部首，再选择连续 4 个未点亮格子。部首与字根一一组合，全部成字则点亮本回合路径。
```

---

## 20. 测试要求

## 20.1 Game Engine 测试

必须覆盖：

1. index 与 row/col 转换正确。
2. 4 邻接判断正确。
3. 4 邻接判断正确。
4. 第一回合允许任意起点。
5. 非第一回合首格必须相邻 currentPosition。
6. 回合内路径必须连续。
7. 已点亮格子不可选。
8. 同一回合不能重复选择格子。
9. 部首重复选择允许。
10. disabled radical 不允许使用。
11. radical + root 有效时返回 resultChar。
12. radical + root 无效时判失败。
13. 成功回合更新 litCellIndices。
14. 成功回合更新 disabledRadicalKeys 去重集合。
15. 成功回合更新 currentPosition。

## 20.2 后端测试

必须覆盖：

1. start 返回 6×6 cells。
2. start 返回 6 个 radical。
3. start 不返回 solutionRounds。
4. start 不返回完整组合表。
5. 合法回合提交 correct=true。
6. 非法组合提交 correct=false 且 errorCount +1。
7. 路径非法提交 correct=false。
8. 使用禁用部首提交失败。
9. 已点亮格子再次提交失败。
10. 9 个成功回合后 completed。
11. completed 后更新排行榜。
12. 其他用户不能提交该 attempt。
13. 未登录不能 start/submit。
14. completed attempt 不能继续 submit。
15. 页面刷新 get attempt 可恢复 lit 状态。

## 20.3 前端测试

必须覆盖：

1. 游戏详情页展示规则、来源和能力维度。
2. 点击开始挑战后展示 6×6 棋盘。
3. 部首池展示 6 个部首。
4. 禁用部首置灰且不可点。
5. 可重复选择同一部首。
6. 可选择 4 个连续格子。
7. 非连续格子不能加入路径。
8. 提交成功后格子点亮。
9. 提交失败后错误次数更新。
10. 全部点亮后显示结果弹窗。
11. 移动端棋盘和部首选择可正常操作。

---

## 21. 验收标准

完成后必须满足：

1. `/games/precise-character-building` 可以看到《精准造字》详情页。
2. 游戏详情页展示来源：最强大脑第十三季第二期。
3. 游戏详情页展示规则、难度、排行榜、能力维度。
4. 点击开始挑战进入游戏页。
5. 游戏页展示 6×6 文字池。
6. 每个格子显示一个汉字字根。
7. 游戏页展示 6 个初始部首。
8. 每回合可以选择 4 个部首。
9. 部首允许重复选择。
10. 上回合使用过的部首在下一回合禁用。
11. 玩家可以选择连续 4 个格子作为本回合路径。
12. 4 个部首和 4 个格子一一组合。
13. 组合全部有效时，4 个格子点亮并显示新字。
14. 组合失败时，本回合不点亮，错误次数 +1。
15. 全部 36 个格子点亮后挑战成功。
16. 记录总用时和错误次数。
17. 排行榜按用时优先、错误次数其次排序。
18. 页面刷新可以恢复当前 attempt 状态。
19. 前端无法获取完整答案和完整组合表。
20. 新游戏接入不影响数字华容道、生命游戏和通用排行榜。

---

## 22. Claude Code 实现顺序

### Step 1：注册游戏元信息

1. 新增 game slug：`precise-character-building`。
2. 新增标题：`精准造字`。
3. 新增三档难度。
4. 新增三个排行榜定义。

### Step 2：建立字库基础表

1. CharacterRadical。
2. CharacterRoot。
3. CharacterCombination。
4. Seed 高频部首、字根和组合。

### Step 3：实现 game-engine

1. 新增 `packages/game-engine/src/precise-character-building`。
2. 实现路径校验。
3. 实现部首冷却校验。
4. 实现组合查表校验。
5. 实现回合状态 reducer。
6. 写单元测试。

### Step 4：建立题库

1. 新增 PreciseCharacterPuzzle。
2. 先人工 seed 3 套 easy、3 套 normal、3 套 hard。
3. 每套 puzzle 必须包含 solutionRounds。
4. 写可解性验证脚本。

### Step 5：后端 API

1. start attempt。
2. submit round。
3. get attempt。
4. abandon attempt。
5. completed 后更新排行榜。
6. 后端测试。

### Step 6：前端页面

1. 注册 webGameRegistry。
2. 实现游戏详情页。
3. 实现 CharacterBoard。
4. 实现 RadicalPool。
5. 实现 RadicalSlotBar。
6. 实现 RoundSubmitPanel。
7. 实现 ResultModal。
8. 适配移动端。

### Step 7：联调验收

1. 完成 easy 全流程。
2. 完成 normal 全流程。
3. 完成 hard 全流程。
4. 验证错误次数。
5. 验证部首禁用。
6. 验证排行榜。
7. 验证刷新恢复。
