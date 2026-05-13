# SuperBrain 前端展示与页面架构设计文档

> 目标读者：前端开发者 / Claude Code / UI 实现代理  
> 目标：为 SuperBrain 益智游戏平台定义一套简约、美观、大气、可扩展、可维护、支持多游戏与未来主题切换的前端展示规范。

---

## 1. 设计目标

SuperBrain 是一个多益智游戏平台，不是单个小游戏页面。前端设计必须满足：

1. 首页一打开即可看到多个游戏卡片，用户能快速选择游戏。
2. 每个游戏拥有清晰的详情页：
   - 游戏名称
   - 游戏简介
   - 考察维度
   - 难度分级
   - 规则说明
   - 右侧排行榜
   - 进入游戏按钮
3. 游戏游玩页聚焦游戏本体：
   - 游戏画面居中
   - 标题、计时、步数、难度、控制按钮清晰可见
   - 排行榜和说明不干扰核心操作
4. 视觉风格简约、美观、大气，体现「SuperBrain」的脑力、竞技、科技、专注感。
5. 页面结构可扩展到几十个游戏，不因新增游戏而重写布局。
6. 支持未来主题切换，例如：
   - Light Theme
   - Dark Theme
   - Neon Brain Theme
   - Minimal Theme
7. 支持响应式布局，桌面端、平板、移动端都有合理展示。
8. 页面组件化，游戏逻辑与通用 UI 解耦。

---

## 2. 设计关键词

整体视觉关键词：

```txt
简约
高级
克制
科技感
脑力竞技
空间感
秩序感
沉浸感
```

避免：

```txt
花哨渐变过多
游戏厅式廉价 UI
过度卡通
大量高饱和色块
粗糙阴影
杂乱按钮
排行榜喧宾夺主
```

SuperBrain 应该更接近：

```txt
Apple Fitness + Chess.com + Lumosity + 科技仪表盘
```

而不是：

```txt
小游戏集合站
页游大厅
低龄卡通游戏站
```

---

## 3. 信息架构

### 3.1 一级页面

```txt
/
  首页 / 游戏大厅

/games
  游戏大厅，可与 / 共用

/games/:gameSlug
  游戏详情页

/games/:gameSlug/play
  游戏游玩页

/games/:gameSlug/leaderboards
  游戏排行榜页，可选

/login
  登录页

/register
  注册页

/profile
  个人中心，后续扩展

/settings
  设置页，后续支持主题切换
```

### 3.2 核心用户路径

#### 路径 A：直接玩游戏

```txt
打开首页
  ↓
浏览游戏卡片
  ↓
点击某个游戏
  ↓
进入游戏详情页
  ↓
选择难度
  ↓
点击开始挑战
  ↓
进入游戏页
  ↓
完成游戏
  ↓
提交成绩
  ↓
展示结果 + 排行榜位置
```

#### 路径 B：查看排行榜

```txt
打开首页
  ↓
点击游戏卡片
  ↓
进入游戏详情页
  ↓
右侧查看排行榜
  ↓
切换难度榜单
  ↓
点击查看更多
  ↓
进入完整排行榜页
```

#### 路径 C：未登录用户开始游戏

```txt
进入游戏详情页
  ↓
点击开始挑战
  ↓
跳转 /login?redirect=/games/:gameSlug/play
  ↓
登录成功
  ↓
回到游戏页
```

---

## 4. 页面整体布局规范

### 4.1 全局布局

所有页面使用统一 App Shell：

```txt
┌──────────────────────────────────────────────┐
│ Top Navigation                               │
├──────────────────────────────────────────────┤
│                                              │
│ Main Content                                 │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.2 顶部导航 Top Navigation

桌面端：

```txt
┌────────────────────────────────────────────────────────────────┐
│ SuperBrain        Games   Leaderboards   About        User Menu │
└────────────────────────────────────────────────────────────────┘
```

移动端：

```txt
┌──────────────────────────────┐
│ SuperBrain              ☰    │
└──────────────────────────────┘
```

导航要求：

1. 高度：64px。
2. 背景：半透明或纯色，支持 sticky。
3. 滚动时可增加轻微 backdrop blur。
4. Logo 左侧固定。
5. 登录后右侧显示用户头像 / 用户名 / 菜单。
6. 未登录显示 Login / Register。

### 4.3 页面宽度

统一内容最大宽度：

```txt
max-width: 1200px
```

宽屏游戏页可使用：

```txt
max-width: 1440px
```

页面左右 padding：

```txt
desktop: 32px
tablet: 24px
mobile: 16px
```

---

## 5. 视觉系统

## 5.1 色彩设计

使用 CSS variables，不在组件中硬编码颜色。

### 5.1.1 基础色板

```css
:root {
  --sb-bg: #f7f8fb;
  --sb-bg-elevated: #ffffff;
  --sb-bg-muted: #f0f2f7;

  --sb-text-primary: #101320;
  --sb-text-secondary: #596174;
  --sb-text-muted: #8b93a7;

  --sb-border: #e3e7ef;
  --sb-border-strong: #cfd6e4;

  --sb-primary: #3b5bff;
  --sb-primary-hover: #2948e8;
  --sb-primary-soft: #eef2ff;

  --sb-accent: #7c3aed;
  --sb-accent-soft: #f3ecff;

  --sb-success: #12a150;
  --sb-warning: #d97706;
  --sb-danger: #dc2626;

  --sb-card-shadow: 0 12px 32px rgba(16, 19, 32, 0.08);
  --sb-card-shadow-hover: 0 20px 48px rgba(16, 19, 32, 0.12);
}
```

### 5.1.2 Dark Theme

```css
[data-theme="dark"] {
  --sb-bg: #080a12;
  --sb-bg-elevated: #111522;
  --sb-bg-muted: #171b2a;

  --sb-text-primary: #f4f7ff;
  --sb-text-secondary: #a8b0c2;
  --sb-text-muted: #6f778a;

  --sb-border: #242b3d;
  --sb-border-strong: #343d55;

  --sb-primary: #7c8cff;
  --sb-primary-hover: #9aa6ff;
  --sb-primary-soft: rgba(124, 140, 255, 0.12);

  --sb-accent: #a78bfa;
  --sb-accent-soft: rgba(167, 139, 250, 0.14);

  --sb-card-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
  --sb-card-shadow-hover: 0 24px 64px rgba(0, 0, 0, 0.42);
}
```

### 5.1.3 Neon Brain Theme，后续可选

```css
[data-theme="neon"] {
  --sb-bg: #050711;
  --sb-bg-elevated: #0c1020;
  --sb-bg-muted: #11172b;

  --sb-text-primary: #f8fbff;
  --sb-text-secondary: #aab7d4;
  --sb-text-muted: #6d7895;

  --sb-border: rgba(107, 124, 255, 0.24);
  --sb-border-strong: rgba(107, 124, 255, 0.44);

  --sb-primary: #00d4ff;
  --sb-primary-hover: #58e4ff;
  --sb-primary-soft: rgba(0, 212, 255, 0.13);

  --sb-accent: #b06cff;
  --sb-accent-soft: rgba(176, 108, 255, 0.16);

  --sb-card-shadow: 0 20px 56px rgba(0, 212, 255, 0.08);
  --sb-card-shadow-hover: 0 24px 72px rgba(176, 108, 255, 0.14);
}
```

---

## 5.2 字体规范

推荐：

```txt
英文/数字: Inter, Geist, system-ui
中文: Noto Sans SC, PingFang SC, Microsoft YaHei
```

CSS：

```css
body {
  font-family:
    Inter,
    "Noto Sans SC",
    "PingFang SC",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
```

### 字号层级

| Token | Size | 用途 |
|---|---:|---|
| `text-xs` | 12px | 标签、辅助说明 |
| `text-sm` | 14px | 次级正文、表格 |
| `text-base` | 16px | 正文、按钮 |
| `text-lg` | 18px | 卡片标题、小标题 |
| `text-xl` | 20px | 页面小标题 |
| `text-2xl` | 24px | 页面标题 |
| `text-3xl` | 30px | 首页标题 |
| `text-4xl` | 36px | Hero 标题 |
| `text-5xl` | 48px | 大屏 Hero |

原则：

1. 不要全页面大字号。
2. 数字指标可以比文字更醒目。
3. 游戏页的计时器可以使用 tabular-nums。

---

## 5.3 圆角、阴影、边框

统一使用：

```txt
Card radius: 24px
Button radius: 14px
Input radius: 12px
Tile radius: 16px
Modal radius: 24px
```

阴影：

```txt
默认卡片：轻阴影
悬停卡片：中等阴影 + 轻微上浮
游戏区域：少阴影，强调专注
排行榜：边框优先，少阴影
```

避免：

```txt
强烈黑色阴影
多层复杂阴影
大面积发光
```

---

## 5.4 动效规范

动效只服务反馈，不做炫技。

基础 transition：

```css
transition:
  transform 180ms ease,
  box-shadow 180ms ease,
  border-color 180ms ease,
  background-color 180ms ease;
```

游戏卡片 hover：

```txt
translateY(-4px)
shadow 加深
border 使用 primary soft
```

按钮 hover：

```txt
background 加深
轻微 translateY(-1px)
```

游戏 tile 移动：

```txt
150ms - 220ms
ease-out
```

页面切换：

```txt
可使用轻微 opacity + translateY
不要大幅动画
```

---

## 6. 核心组件系统

组件目录建议：

```txt
apps/web/src/components/
  layout/
    AppShell.tsx
    TopNav.tsx
    PageContainer.tsx
    SectionHeader.tsx

  ui/
    Button.tsx
    Card.tsx
    Badge.tsx
    Tabs.tsx
    Select.tsx
    Modal.tsx
    Skeleton.tsx
    EmptyState.tsx
    MetricPill.tsx

  game/
    GameCard.tsx
    GameGrid.tsx
    GameDimensionBadge.tsx
    DifficultySelector.tsx
    LeaderboardPreview.tsx
    GameStage.tsx
    GameHud.tsx
    GameResultModal.tsx
```

---

## 7. 游戏数据展示模型

前端游戏展示不应写死字段，建议统一游戏元数据结构。

```ts
export interface GameDisplayMeta {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  coverUrl?: string;

  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  dimensions: BrainDimension[];
  difficultyLevels: DifficultyLevel[];

  estimatedDuration?: string;
  source?: string;
  tags: string[];

  visual: {
    accentColor?: string;
    icon?: string;
    backgroundPattern?: "grid" | "dots" | "waves" | "none";
  };
}

export interface BrainDimension {
  key:
    | "memory"
    | "spatial"
    | "logic"
    | "attention"
    | "calculation"
    | "reaction"
    | "planning"
    | "observation";
  label: string;
  value: number; // 0 - 100
}

export interface DifficultyLevel {
  key: string;
  label: string;
  description?: string;
  recommended?: boolean;
}
```

示例：

```ts
const slidingPuzzleMeta: GameDisplayMeta = {
  slug: "sliding-puzzle",
  title: "数字华容道",
  subtitle: "滑动数字方块，复原有序棋盘",
  description: "考察空间推理、路径规划与局部搜索能力。",
  status: "PUBLISHED",
  dimensions: [
    { key: "spatial", label: "空间推理", value: 92 },
    { key: "planning", label: "路径规划", value: 86 },
    { key: "attention", label: "专注控制", value: 74 }
  ],
  difficultyLevels: [
    { key: "easy", label: "3x3", description: "入门" },
    { key: "normal", label: "4x4", description: "标准", recommended: true },
    { key: "hard", label: "5x5", description: "挑战" }
  ],
  estimatedDuration: "1-10 min",
  source: "经典滑块谜题 / 最强大脑风格益智题",
  tags: ["空间推理", "路径规划", "经典谜题"],
  visual: {
    accentColor: "#3b5bff",
    backgroundPattern: "grid"
  }
};
```

---

## 8. 首页 / 游戏大厅设计

### 8.1 页面目标

首页不是宣传页优先，而是游戏选择优先。

打开页面后第一屏必须看到：

1. SuperBrain 品牌标题。
2. 简短定位说明。
3. 游戏卡片区域。
4. 可选分类 / 搜索 / 难度过滤。

---

### 8.2 桌面端布局

```txt
┌────────────────────────────────────────────────────────────────────┐
│ TopNav                                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  SuperBrain                                                        │
│  Train your mind through structured cognitive challenges.           │
│                                                                    │
│  [全部] [空间推理] [记忆] [逻辑] [反应]        Search games...      │
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Game Card    │ │ Game Card    │ │ Game Card    │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Game Card    │ │ Game Card    │ │ Game Card    │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 8.3 移动端布局

```txt
┌──────────────────────────┐
│ TopNav                   │
├──────────────────────────┤
│ SuperBrain               │
│ Brain training games     │
│                          │
│ Search                   │
│ Horizontal category tabs │
│                          │
│ ┌──────────────────────┐ │
│ │ Game Card            │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Game Card            │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

---

### 8.4 首页 Hero

Hero 应该简洁，不要占据过多屏幕。

```tsx
<section className="home-hero">
  <div>
    <p className="eyebrow">SUPERBRAIN ARENA</p>
    <h1>用结构化挑战训练你的脑力</h1>
    <p>
      选择一个认知挑战，完成计时成绩，进入排行榜。
    </p>
  </div>

  <div className="hero-metrics">
    <MetricPill label="Games" value="12+" />
    <MetricPill label="Dimensions" value="8" />
    <MetricPill label="Ranking" value="Live" />
  </div>
</section>
```

视觉要求：

1. Hero 高度不要超过 280px。
2. 游戏卡片必须在首屏可见。
3. Hero 背景可使用非常轻微的网格纹理。
4. 不要使用复杂插画。

---

## 9. 游戏卡片 GameCard 设计

### 9.1 卡片信息

每张游戏卡片展示：

1. 游戏名称。
2. 一句话副标题。
3. 考察维度标签。
4. 难度数量。
5. 预计耗时。
6. 来源或类型。
7. 状态标签，例如 New、Popular、Coming Soon。

### 9.2 卡片结构

```txt
┌────────────────────────────────────┐
│ [Icon]                   New       │
│                                    │
│ 数字华容道                         │
│ 滑动数字方块，复原有序棋盘           │
│                                    │
│ [空间推理] [路径规划] [专注控制]      │
│                                    │
│ 3 difficulties        1-10 min     │
└────────────────────────────────────┘
```

### 9.3 视觉规范

```txt
background: var(--sb-bg-elevated)
border: 1px solid var(--sb-border)
border-radius: 24px
padding: 24px
min-height: 220px
```

Hover：

```txt
transform: translateY(-4px)
box-shadow: var(--sb-card-shadow-hover)
border-color: var(--sb-primary)
```

### 9.4 GameCard Props

```ts
interface GameCardProps {
  game: GameDisplayMeta;
  onClick?: () => void;
}
```

---

## 10. 游戏详情页设计

### 10.1 页面目标

点击游戏卡片后，不直接进入游戏，而是先进入详情页，让用户理解：

1. 这个游戏是什么。
2. 考察哪些能力。
3. 有哪些难度。
4. 当前排行榜情况。
5. 点击后才开始游戏。

---

### 10.2 桌面端布局

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ TopNav                                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌──────────────────────────────────────────────┐ ┌───────────────────────┐ │
│ │ Game Header                                  │ │ Leaderboard Preview    │ │
│ │                                              │ │                       │ │
│ │ 数字华容道                                    │ │ 4x4 最快通关榜          │ │
│ │ 滑动数字方块，复原有序棋盘                      │ │ 1. Alice  00:32        │ │
│ │                                              │ │ 2. Bob    00:41        │ │
│ │ [空间推理] [路径规划] [专注控制]                 │ │ 3. Carol  00:45        │ │
│ │                                              │ │                       │ │
│ │ Difficulty                                  │ │ [查看完整排行榜]        │ │
│ │ [3x3] [4x4] [5x5]                            │ └───────────────────────┘ │
│ │                                              │                           │
│ │ 能力维度                                     │                           │
│ │ 空间推理  █████████░ 92                       │                           │
│ │ 路径规划  ████████░░ 86                       │                           │
│ │ 专注控制  ███████░░░ 74                       │                           │
│ │                                              │                           │
│ │ [开始挑战] [查看规则]                          │                           │
│ └──────────────────────────────────────────────┘                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 移动端布局

```txt
┌──────────────────────────────┐
│ TopNav                       │
├──────────────────────────────┤
│ 数字华容道                    │
│ 游戏简介                      │
│                              │
│ 考察维度 badges               │
│                              │
│ Difficulty tabs              │
│                              │
│ [开始挑战]                   │
│                              │
│ Leaderboard Preview          │
│                              │
│ Rules                        │
└──────────────────────────────┘
```

---

### 10.4 游戏详情页组件拆分

```txt
features/games/detail/
  GameDetailPage.tsx
  GameHeroPanel.tsx
  BrainDimensionPanel.tsx
  DifficultySelector.tsx
  GameRulePanel.tsx
  LeaderboardPreviewPanel.tsx
```

---

### 10.5 GameHeroPanel

展示：

1. `title`
2. `subtitle`
3. `description`
4. `source`
5. `tags`
6. 开始按钮

样式：

```txt
大卡片
左上角显示游戏 icon
标题 32px
描述 16px
按钮固定放在内容下方
```

---

### 10.6 BrainDimensionPanel

能力维度展示不要用复杂雷达图作为第一版。建议用横向进度条，清晰、轻量。

```txt
空间推理    █████████░ 92
路径规划    ████████░░ 86
专注控制    ███████░░░ 74
```

组件：

```ts
interface BrainDimensionPanelProps {
  dimensions: BrainDimension[];
}
```

后续如果要更强视觉，可以扩展为 radar chart，但 MVP 不必引入图表库。

---

### 10.7 DifficultySelector

要求：

1. 支持任意数量难度。
2. 每个游戏难度 key 不固定。
3. 难度展示来自后端。
4. 当前选择影响排行榜 preview 和开始游戏参数。

结构：

```txt
[3x3 入门] [4x4 标准] [5x5 挑战]
```

Props：

```ts
interface DifficultySelectorProps {
  levels: DifficultyLevel[];
  value: string;
  onChange: (difficultyKey: string) => void;
}
```

---

### 10.8 LeaderboardPreviewPanel

右侧排行榜预览。

展示：

1. 当前游戏 + 当前难度的榜单。
2. Top 5。
3. 用户自己的最好成绩，如果已登录。
4. 查看完整排行榜按钮。

结构：

```txt
┌──────────────────────────────┐
│ 4x4 最快通关榜                │
│                              │
│ #   Player        Time Moves │
│ 1   Alice        00:32  98   │
│ 2   Bob          00:41  120  │
│ 3   Carol        00:45  131  │
│                              │
│ Your best: 01:12 / 155 moves │
│                              │
│ [查看完整排行榜]              │
└──────────────────────────────┘
```

排行榜 preview 不要过大，避免压过游戏介绍。

---

## 11. 游戏游玩页设计

### 11.1 页面目标

游戏页要最大化专注度。

核心原则：

```txt
游戏画面居中
HUD 信息清晰
非必要信息收起或放侧边
排行榜不干扰操作
移动端优先保证游戏区域可操作
```

---

### 11.2 桌面端布局

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ TopNav                                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────┐ ┌──────────────────────────────┐ ┌───────────────┐ │
│ │ Game Info          │ │ Game Stage                   │ │ Side Panel     │ │
│ │                    │ │                              │ │               │ │
│ │ 数字华容道          │ │        ┌────────────┐        │ │ Ranking       │ │
│ │ 4x4 标准            │ │        │            │        │ │ Top 5         │ │
│ │                    │ │        │   Board    │        │ │               │ │
│ │ Time   00:42        │ │        │            │        │ │ Rules         │ │
│ │ Moves  128          │ │        └────────────┘        │ │               │ │
│ │                    │ │                              │ │               │ │
│ │ [重开] [退出]       │ │                              │ │               │ │
│ └────────────────────┘ └──────────────────────────────┘ └───────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

推荐宽度比例：

```txt
left panel: 240px
game stage: flexible, min 520px
right panel: 280px
gap: 24px
```

大屏：

```css
.play-layout {
  display: grid;
  grid-template-columns: 240px minmax(520px, 1fr) 280px;
  gap: 24px;
}
```

中屏：

```css
.play-layout {
  grid-template-columns: minmax(0, 1fr);
}
```

中屏以下将 Info 和 Side Panel 放到游戏区下方。

---

### 11.3 移动端布局

```txt
┌──────────────────────────────┐
│ TopNav                       │
├──────────────────────────────┤
│ 数字华容道 · 4x4              │
│ 00:42        128 moves        │
│                              │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │        Game Board        │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ [重开] [退出]                │
│                              │
│ 排行榜 / 规则 tabs            │
└──────────────────────────────┘
```

移动端原则：

1. 游戏棋盘必须尽量靠上。
2. 不要让排行榜占据首屏。
3. 时间和步数横向排列。
4. 控制按钮放在棋盘下方。
5. 规则和排行榜放入 Tabs 或 Accordion。

---

## 12. 游戏页组件结构

```txt
features/games/play/
  GamePlayLayout.tsx
  GameInfoPanel.tsx
  GameStage.tsx
  GameHud.tsx
  GameControlBar.tsx
  GameSidePanel.tsx
  GameResultModal.tsx
```

### 12.1 GamePlayLayout

负责布局，不包含具体游戏逻辑。

```tsx
interface GamePlayLayoutProps {
  title: string;
  difficultyLabel: string;
  hud: React.ReactNode;
  stage: React.ReactNode;
  controls: React.ReactNode;
  sidePanel?: React.ReactNode;
}
```

### 12.2 GameStage

统一游戏舞台容器。

```txt
居中
固定最大宽度
自适应移动端
背景简洁
内部由具体游戏渲染
```

样式建议：

```css
.game-stage {
  min-height: 620px;
  border-radius: 32px;
  background:
    radial-gradient(circle at top, var(--sb-primary-soft), transparent 36%),
    var(--sb-bg-elevated);
  border: 1px solid var(--sb-border);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 12.3 GameHud

展示高频游戏数据：

```txt
Time
Moves
Difficulty
Best
```

Props：

```ts
interface GameHudProps {
  items: Array<{
    label: string;
    value: string | number;
    emphasize?: boolean;
  }>;
}
```

视觉：

```txt
数字大
label 小
使用 tabular nums
```

### 12.4 GameControlBar

按钮：

```txt
Start
Restart
Pause，后续可选
Exit
```

不要在每个游戏内部重复设计按钮样式。

---

## 13. 数字华容道页面展示规范

### 13.1 页面结构

```txt
GamePlayLayout
  ├── GameInfoPanel
  │     ├── title: 数字华容道
  │     ├── difficulty: 4x4 标准
  │     ├── time
  │     ├── moves
  │     └── controls
  │
  ├── GameStage
  │     └── SlidingPuzzleBoard
  │
  └── GameSidePanel
        ├── LeaderboardPreview
        └── Rules
```

### 13.2 SlidingPuzzleBoard

棋盘要求：

1. 正方形。
2. 桌面端最大 520px。
3. 移动端宽度 `min(100vw - 32px, 420px)`。
4. tile 间距根据尺寸自适应。
5. 3x3 tile 大，5x5 tile 稍小。
6. 空格透明。
7. tile 有轻微立体感，但不要厚重。

CSS 示例：

```css
.sliding-board {
  width: min(520px, calc(100vw - 32px));
  aspect-ratio: 1 / 1;
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 28px;
  background: var(--sb-bg-muted);
  border: 1px solid var(--sb-border);
}

.sliding-tile {
  border-radius: 16px;
  background: var(--sb-bg-elevated);
  border: 1px solid var(--sb-border);
  box-shadow: 0 8px 18px rgba(16, 19, 32, 0.08);
  font-weight: 700;
  color: var(--sb-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.sliding-tile:hover {
  border-color: var(--sb-primary);
  transform: translateY(-1px);
}

.sliding-tile-empty {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  cursor: default;
}
```

### 13.3 游戏完成弹窗

完成后显示 Result Modal：

```txt
┌──────────────────────────────┐
│ Challenge Complete            │
│                              │
│ Time        00:52             │
│ Moves       132               │
│ Difficulty  4x4               │
│ Rank        #18               │
│                              │
│ [再玩一次] [查看排行榜]        │
└──────────────────────────────┘
```

要求：

1. 不要使用浏览器 alert。
2. 弹窗中展示服务端确认后的成绩。
3. 如果刷新个人最佳，显示 `New Personal Best` badge。
4. 支持重新开始同难度。

---

## 14. 排行榜页面设计

### 14.1 完整排行榜页

路径：

```txt
/games/:gameSlug/leaderboards
```

布局：

```txt
┌────────────────────────────────────────────┐
│ 数字华容道排行榜                             │
│ [3x3] [4x4] [5x5]                           │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ #  Player        Time    Moves   Date  │ │
│ │ 1  Alice         00:32   98      ...   │ │
│ │ 2  Bob           00:41   120     ...   │ │
│ │ 3  Carol         00:45   131     ...   │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### 14.2 表格规范

列：

1. Rank
2. Player
3. 主指标，例如 Time / Score
4. Tie-breaker 指标，例如 Moves
5. Completed At

支持不同游戏指标：

```ts
interface LeaderboardColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  formatter?: "duration" | "number" | "date" | "percent";
}
```

不要为每个游戏单独写排行榜表格。

---

## 15. 可扩展游戏接入规范

每个游戏前端至少提供：

```txt
features/games/<gameSlug>/
  <GameSlug>PlayPage.tsx
  <GameSlug>Board.tsx
  components.tsx
  hooks.ts
  index.ts
```

并在 registry 注册：

```ts
export interface WebGameRegistryItem {
  slug: string;
  playComponent: React.LazyExoticComponent<React.ComponentType>;
  resultRenderer?: React.ComponentType<GameResultRendererProps>;
}

export const webGameRegistry: Record<string, WebGameRegistryItem> = {
  "sliding-puzzle": {
    slug: "sliding-puzzle",
    playComponent: lazy(() => import("./sliding-puzzle/SlidingPuzzlePlayPage")),
  },
};
```

通用页面根据 game slug 加载具体游戏组件。

新增游戏时，不应修改：

```txt
AppShell
TopNav
GameCard
GameDetailPage
LeaderboardPreviewPanel
LeaderboardTable
GamePlayLayout
```

只新增具体游戏实现。

---

## 16. 主题系统设计

### 16.1 ThemeProvider

```ts
type ThemeName = "light" | "dark" | "neon" | "system";

interface ThemeState {
  theme: ThemeName;
  resolvedTheme: "light" | "dark" | "neon";
  setTheme: (theme: ThemeName) => void;
}
```

应用启动：

1. 从 localStorage 读取 theme preference。
2. 如果是 `system`，读取 `prefers-color-scheme`。
3. 设置到 `document.documentElement.dataset.theme`。

```ts
document.documentElement.dataset.theme = resolvedTheme;
```

### 16.2 组件使用原则

组件只能使用 CSS variables：

```css
background: var(--sb-bg-elevated);
color: var(--sb-text-primary);
border-color: var(--sb-border);
```

禁止直接写：

```css
background: #ffffff;
color: #111111;
```

这样后续主题切换不会重构组件。

---

## 17. 响应式断点

建议断点：

```ts
const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};
```

页面策略：

| 页面 | 桌面 | 平板 | 移动 |
|---|---|---|---|
| 首页 | 3 列卡片 | 2 列卡片 | 1 列卡片 |
| 游戏详情 | 左详情 + 右榜单 | 单列，榜单下移 | 单列 |
| 游戏页 | 左 HUD + 中 Stage + 右 Panel | Stage 优先，Panel 下移 | 紧凑 HUD + Stage + Tabs |
| 排行榜 | 宽表格 | 表格压缩 | 卡片式排行或横向滚动 |

---

## 18. Loading / Empty / Error 状态

不要出现裸文本加载。

### 18.1 Loading

使用 Skeleton：

```txt
首页：GameCard skeleton grid
详情页：HeroPanel skeleton + Leaderboard skeleton
游戏页：Stage skeleton
排行榜：Table skeleton
```

### 18.2 Empty

例如暂无排行榜：

```txt
暂无成绩
完成一次挑战后，你的成绩会出现在这里。
[开始挑战]
```

### 18.3 Error

错误状态要可恢复：

```txt
加载失败
网络异常或服务暂不可用。
[重试]
```

---

## 19. 可访问性要求

1. 所有按钮必须有明确文本或 `aria-label`。
2. 游戏 tile 支持键盘操作，至少支持 tab focus + enter。
3. 色彩不能只依赖颜色表达状态，要有文本标签。
4. 排行榜表格使用语义化 table。
5. Modal 打开时 focus trap。
6. Modal 关闭后 focus 回到触发按钮。
7. 动效尊重 `prefers-reduced-motion`。

CSS：

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 20. 页面实现顺序

Claude Code 应按以下顺序改造前端页面。

### Step 1：建立设计变量

1. 创建 `styles/tokens.css`。
2. 定义 light/dark/neon theme variables。
3. 全局引入。
4. 替换硬编码颜色。

### Step 2：建立 AppShell

1. `AppShell`
2. `TopNav`
3. `PageContainer`
4. `SectionHeader`

### Step 3：建立通用 UI 组件

1. `Button`
2. `Card`
3. `Badge`
4. `Tabs`
5. `MetricPill`
6. `Skeleton`
7. `EmptyState`

### Step 4：改造首页

1. 增加 Hero。
2. 增加游戏筛选 tabs。
3. 增加搜索框。
4. 使用 `GameGrid` + `GameCard`。
5. 保证首屏能看到游戏卡片。

### Step 5：实现游戏详情页

1. `GameHeroPanel`
2. `BrainDimensionPanel`
3. `DifficultySelector`
4. `LeaderboardPreviewPanel`
5. `GameRulePanel`

### Step 6：实现游戏页通用布局

1. `GamePlayLayout`
2. `GameInfoPanel`
3. `GameStage`
4. `GameHud`
5. `GameControlBar`
6. `GameSidePanel`
7. `GameResultModal`

### Step 7：改造数字华容道

1. 把棋盘放入 `GameStage`。
2. 使用统一 HUD 展示时间和步数。
3. 使用统一控制栏。
4. 完成后展示 Result Modal。
5. 移动端优化棋盘尺寸。

### Step 8：排行榜页

1. 实现通用 `LeaderboardTable`。
2. 支持不同游戏指标列。
3. 支持难度 tab。
4. 支持空状态和加载状态。

### Step 9：主题切换

1. 增加 `ThemeProvider`。
2. 增加设置入口。
3. 使用 CSS variables 切换主题。
4. 保证所有通用组件支持主题。

---

## 21. 验收标准

完成后必须满足：

1. 打开首页第一屏能看到多个游戏卡片。
2. 首页视觉简洁，卡片间距合理，不拥挤。
3. 游戏卡片 hover 有明确但克制的反馈。
4. 点击游戏卡片进入游戏详情页。
5. 游戏详情页左侧展示游戏信息、考察维度、难度选择。
6. 游戏详情页右侧展示当前难度排行榜。
7. 切换难度时，排行榜 preview 同步变化。
8. 点击开始挑战进入游戏页。
9. 游戏页中游戏画面位于视觉中心。
10. 时间、步数、标题、难度清晰展示。
11. 游戏完成后出现统一 Result Modal。
12. 移动端游戏页面不需要横向滚动。
13. 排行榜表格支持不同游戏的指标字段。
14. 新增一个游戏时，不需要修改首页布局和排行榜通用组件。
15. 所有颜色来自 CSS variables。
16. 可以通过 `data-theme` 切换 light/dark/neon。
17. Loading、Empty、Error 状态都有设计，不出现裸文本。
18. 页面风格符合 SuperBrain：简约、科技、专注、大气。

---

## 22. 不推荐的实现方式

避免：

1. 每个游戏单独写详情页。
2. 每个游戏单独写排行榜表格。
3. 首页只是普通列表，没有品牌感。
4. 游戏页把排行榜、说明、按钮全部堆在棋盘周围。
5. 使用大面积高饱和渐变背景。
6. 将主题颜色写死在组件中。
7. 将游戏难度写死在前端。
8. 直接进入游戏而没有详情页。
9. 移动端直接缩放桌面布局。
10. 用 alert 展示完成结果。

---

## 23. 推荐最终页面体验

### 首页

用户打开页面后，应感觉这是一个专业的脑力挑战平台：

```txt
SuperBrain
结构化脑力挑战平台

[全部] [空间推理] [记忆] [逻辑] [反应]

数字华容道      记忆矩阵       逻辑迷宫
空间推理        短时记忆       推理规划
```

### 游戏详情页

用户能快速知道：

```txt
这个游戏练什么
有多难
怎么玩
当前榜单是什么水平
```

### 游戏页

用户进入后只关注：

```txt
当前游戏
当前用时
当前步数
游戏主体
完成后的成绩反馈
```

这是 SuperBrain 的核心体验。
