# SuperBrain Admin 管理系统设计文档

> 目标：为 SuperBrain 多益智游戏平台设计一个完备、可靠、高效、可扩展的管理员管理系统。  
> 范围：管理员后台、权限系统、用户管理、游戏管理、题库管理、排行榜管理、挑战记录管理、数据库/运维管理、审计日志。  
> 说明：具体每个游戏需要管理哪些业务字段，后续再补充。本设计先预留扩展槽位和通用管理框架。

---

## 1. 设计目标

Admin 管理系统不是简单的隐藏页面，而是平台长期运营、内容管理、题库维护、用户管理、数据审核和系统运维的核心后台。

必须满足：

1. 支持多角色、多权限的管理员体系。
2. 支持用户管理、封禁、解封、角色调整、登录会话管理。
3. 支持游戏元信息管理。
4. 支持题库管理，并为不同游戏保留自定义题库字段。
5. 支持排行榜配置、成绩审核、异常成绩处理。
6. 支持挑战记录、提交记录、回放数据查看。
7. 支持数据库状态查看、迁移状态、备份、导入导出等运维能力。
8. 所有敏感操作必须记录审计日志。
9. 后台与玩家前台解耦，便于独立迭代和部署。
10. 管理端页面要高效支持大量数据，例如用户、题目、提交记录、排行榜条目。
11. 权限校验必须在后端完成，前端只做展示控制。
12. 游戏管理字段后续可扩展，不因新增游戏而重构管理系统。

---

## 2. 集成方式选择

### 2.2 方案：新建独立 Admin 前端应用

结构：

```txt
apps/web       # 玩家前台
apps/admin     # 管理后台
apps/api       # 共用后端 API
packages/shared
packages/ui
```

开发端口：

```txt
web:   http://localhost:5173
admin: http://localhost:5174
api:   http://localhost:3000/api
```

生产部署可选：

```txt
https://superbrain.example.com
https://admin.superbrain.example.com
https://api.superbrain.example.com
```

或：

```txt
https://superbrain.example.com
https://superbrain.example.com/admin
https://superbrain.example.com/api
```

优点：

1. 管理端和玩家端工程边界清晰。
2. 管理端可使用更适合后台的组件和数据表格。
3. 玩家端 bundle 不包含管理端代码。
4. 独立部署、独立发布。
5. 权限和路由隔离更清晰。
6. 更适合长期扩展题库管理、数据管理、审计系统。

缺点：

1. 初期工程复杂度略高。
2. 需要维护两个前端应用。
3. 需要统一 design tokens 和 API 类型。

---

## 3. 推荐方案

推荐采用：

```txt
独立 Admin 前端应用 + 共用 NestJS API
```

也就是：

```txt
apps/web       # 玩家端
apps/admin     # 管理端
apps/api       # 共用 API，新增 /api/admin/*
packages/shared
packages/ui
```

开发环境：

```txt
玩家端：http://localhost:5173
管理端：http://localhost:5174
后端：http://localhost:3000/api
```

生产环境优先推荐：

```txt
https://superbrain.example.com
https://admin.superbrain.example.com
https://api.superbrain.example.com
```

如果部署资源有限，也可以用同域路径：

```txt
https://superbrain.example.com
https://superbrain.example.com/admin
https://superbrain.example.com/api
```

玩家端中可以保留入口：

```txt
User Menu → Admin Console
```

但该入口只是跳转入口，不是安全边界。真正的权限边界必须由后端：

```txt
AdminAuthGuard + PermissionGuard + AdminAuditLog
```

保证。

---

## 4. 总体架构

```txt
Browser
  │
  ├── apps/web: 玩家前台
  │      └── /api/*
  │
  └── apps/admin: 管理后台
         └── /api/admin/*

apps/api NestJS
  ├── AuthModule
  ├── AdminModule
  │    ├── AdminDashboardModule
  │    ├── AdminUsersModule
  │    ├── AdminRolesModule
  │    ├── AdminGamesModule
  │    ├── AdminPuzzlesModule
  │    ├── AdminLeaderboardsModule
  │    ├── AdminAttemptsModule
  │    ├── AdminDatabaseModule
  │    └── AdminAuditModule
  │
  ├── UsersModule
  ├── GamesModule
  ├── AttemptsModule
  ├── LeaderboardsModule
  ├── PrismaModule
  └── RedisModule

PostgreSQL
Redis
Object Storage，后续可选
```

---

## 5. Admin 前端工程结构

```txt
apps/admin/
  package.json
  index.html
  vite.config.ts
  tsconfig.json

  src/
    main.tsx
    app/
      AdminApp.tsx
      router.tsx
      providers.tsx

    layouts/
      AdminShell.tsx
      AdminSidebar.tsx
      AdminTopbar.tsx
      AdminBreadcrumb.tsx

    routes/
      login.tsx
      dashboard.tsx

      users/
        user-list.tsx
        user-detail.tsx
        user-sessions.tsx
        user-permissions.tsx

      roles/
        role-list.tsx
        role-detail.tsx
        permission-list.tsx

      games/
        game-list.tsx
        game-detail.tsx
        game-edit.tsx
        game-create.tsx

      puzzles/
        puzzle-list.tsx
        puzzle-detail.tsx
        puzzle-edit.tsx
        puzzle-create.tsx
        puzzle-import.tsx
        puzzle-review.tsx

      leaderboards/
        leaderboard-list.tsx
        leaderboard-detail.tsx
        leaderboard-entries.tsx

      attempts/
        attempt-list.tsx
        attempt-detail.tsx
        submission-detail.tsx

      database/
        database-overview.tsx
        migrations.tsx
        backups.tsx
        data-export.tsx
        maintenance.tsx

      audit/
        audit-log-list.tsx
        audit-log-detail.tsx

      settings/
        system-settings.tsx
        admin-profile.tsx

    features/
      auth/
      users/
      roles/
      games/
      puzzles/
      leaderboards/
      attempts/
      database/
      audit/

    components/
      admin/
        AdminPage.tsx
        AdminSection.tsx
        DataTable.tsx
        FilterBar.tsx
        ConfirmActionDialog.tsx
        PermissionGate.tsx
        JsonViewer.tsx
        JsonEditor.tsx
        StatusBadge.tsx
        AuditTimeline.tsx

      ui/
        Button.tsx
        Card.tsx
        Badge.tsx
        Input.tsx
        Select.tsx
        Tabs.tsx
        Modal.tsx
        Drawer.tsx
        Tooltip.tsx
        Skeleton.tsx

    lib/
      admin-api-client.ts
      query-client.ts
      permissions.ts
      format.ts
```

---

## 6. Admin 页面布局

Admin UI 与玩家端视觉风格保持 SuperBrain 的简约、清晰、大气风格，但信息密度更高。

### 6.1 桌面端布局

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Topbar: Breadcrumb / Search / Current Admin / Theme / Logout          │
├───────────────┬──────────────────────────────────────────────────────┤
│ Sidebar       │ Main Content                                          │
│               │                                                       │
│ Dashboard     │ Page Header                                           │
│ Users         │ Filters / Actions                                     │
│ Roles         │ Data Table / Form / Detail Panels                     │
│ Games         │                                                       │
│ Puzzles       │                                                       │
│ Leaderboards  │                                                       │
│ Attempts      │                                                       │
│ Database      │                                                       │
│ Audit Logs    │                                                       │
│ Settings      │                                                       │
└───────────────┴──────────────────────────────────────────────────────┘
```

### 6.2 移动端

管理端移动端只保证基础可用，不优先优化复杂表格操作。

移动端策略：

1. Sidebar 折叠为 Drawer。
2. 表格横向滚动。
3. 关键操作保留。
4. 复杂题库编辑器建议提示使用桌面端。

---

## 7. 权限系统设计

### 7.1 权限模型选择

当前简单的：

```txt
User.role = USER | ADMIN
```

不足以支撑长期后台。

推荐升级为 RBAC：

```txt
User
  └── UserRole
        └── Role
              └── RolePermission
                    └── Permission
```

权限以细粒度 action 表示。

---

### 7.2 角色设计

内置角色：

| 角色 | 说明 |
|---|---|
| `SUPER_ADMIN` | 最高权限，可管理系统配置、角色权限、数据库操作 |
| `ADMIN` | 普通管理员，可管理大部分业务内容 |
| `CONTENT_MANAGER` | 内容管理员，可管理游戏元信息和题库 |
| `PUZZLE_EDITOR` | 题库编辑，可创建和编辑题目，但不能发布 |
| `PUZZLE_REVIEWER` | 题库审核，可审核和发布题目 |
| `MODERATOR` | 审核员，可处理用户、成绩、异常记录 |
| `ANALYST` | 数据分析，只读查看数据 |
| `SUPPORT` | 客服，只读用户信息和部分操作 |

说明：

1. 一个用户可以拥有多个角色。
2. 权限以 Permission 为准，角色只是权限集合。
3. UI 可以按角色展示默认菜单，但后端必须按 Permission 校验。

---

### 7.3 权限命名规范

权限格式：

```txt
resource:action
```

示例：

```txt
users:read
users:update
users:ban
users:manage_roles
users:revoke_sessions

roles:read
roles:create
roles:update
roles:delete
permissions:read

games:read
games:create
games:update
games:publish
games:archive

puzzles:read
puzzles:create
puzzles:update
puzzles:review
puzzles:publish
puzzles:archive
puzzles:import
puzzles:export

leaderboards:read
leaderboards:update
leaderboards:reset
leaderboards:invalidate_entry

attempts:read
attempts:invalidate
attempts:review

database:read
database:backup
database:export
database:maintenance
database:read_query

audit:read

system:read
system:update
```

---

### 7.4 权限矩阵

| 模块 | SUPER_ADMIN | ADMIN | CONTENT_MANAGER | PUZZLE_EDITOR | PUZZLE_REVIEWER | MODERATOR | ANALYST | SUPPORT |
|---|---|---|---|---|---|---|---|---|
| Dashboard | 全部 | 全部 | 内容数据 | 题库数据 | 审核数据 | 审核数据 | 只读 | 只读 |
| 用户查看 | 是 | 是 | 否 | 否 | 否 | 是 | 只读聚合 | 是 |
| 用户封禁 | 是 | 是 | 否 | 否 | 否 | 是 | 否 | 否 |
| 角色权限 | 是 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| 游戏管理 | 是 | 是 | 是 | 只读 | 只读 | 否 | 只读 | 否 |
| 题库创建 | 是 | 是 | 是 | 是 | 否 | 否 | 否 | 否 |
| 题库发布 | 是 | 是 | 是 | 否 | 是 | 否 | 否 | 否 |
| 排行榜管理 | 是 | 是 | 否 | 否 | 否 | 是 | 只读 | 否 |
| 挑战记录审核 | 是 | 是 | 否 | 否 | 否 | 是 | 只读 | 只读 |
| 数据库管理 | 是 | 只读 | 否 | 否 | 否 | 否 | 否 | 否 |
| 审计日志 | 是 | 是 | 否 | 否 | 否 | 部分 | 否 | 否 |

---

## 8. 权限数据库模型

### 8.1 Role

```prisma
model Role {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String?
  system      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userRoles   UserRole[]
  permissions RolePermission[]
}
```

### 8.2 Permission

```prisma
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique
  resource    String
  action      String
  description String?
  createdAt   DateTime @default(now())

  roles       RolePermission[]
}
```

### 8.3 UserRole

```prisma
model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())
  createdBy String?

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
}
```

### 8.4 RolePermission

```prisma
model RolePermission {
  id           String     @id @default(cuid())
  roleId       String
  permissionId String
  createdAt    DateTime   @default(now())

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}
```

---

## 9. Admin API 权限校验

后端新增：

```txt
AdminAuthGuard
PermissionGuard
RequirePermissions decorator
AdminAuditInterceptor
```

使用示例：

```ts
@Get("/admin/users")
@UseGuards(AdminAuthGuard, PermissionGuard)
@RequirePermissions("users:read")
async listUsers() {}
```

```ts
@Post("/admin/users/:id/ban")
@UseGuards(AdminAuthGuard, PermissionGuard)
@RequirePermissions("users:ban")
async banUser() {}
```

原则：

1. 每一个 `/api/admin/*` 接口必须有权限声明。
2. 只校验 `ADMIN` 角色不够，必须校验 Permission。
3. 权限不足返回 403。
4. 未登录返回 401。
5. 敏感接口必须写审计日志。

---

## 10. 审计日志系统

所有管理员操作必须记录。

### 10.1 AdminAuditLog 模型

```prisma
model AdminAuditLog {
  id            String   @id @default(cuid())
  actorUserId   String?
  actorUsername String?
  action        String
  resourceType  String
  resourceId    String?
  before        Json?
  after         Json?
  metadata      Json     @default("{}")
  ipAddress     String?
  userAgent     String?
  requestId     String?
  createdAt     DateTime @default(now())

  @@index([actorUserId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])
}
```

### 10.2 必须记录的操作

```txt
users:update
users:ban
users:unban
users:delete
users:manage_roles
users:revoke_sessions

games:create
games:update
games:publish
games:archive
games:delete

puzzles:create
puzzles:update
puzzles:review
puzzles:publish
puzzles:archive
puzzles:import
puzzles:delete

leaderboards:update
leaderboards:invalidate_entry
leaderboards:reset

attempts:invalidate
attempts:restore

database:backup
database:export
database:maintenance
database:read_query

roles:create
roles:update
roles:delete
roles:assign
permissions:update
```

---

## 11. Admin Dashboard

首页路径：

```txt
/admin
```

或独立应用：

```txt
/
```

展示模块：

1. 今日活跃用户。
2. 今日挑战次数。
3. 今日完成次数。
4. 今日新增用户。
5. 题库数量。
6. 待审核题目数量。
7. 异常成绩数量。
8. 最近管理员操作。
9. 游戏热度排行。
10. 系统健康状态。

布局：

```txt
┌──────────────────────────────────────────────┐
│ Dashboard                                    │
├──────────────┬──────────────┬───────────────┤
│ Active Users │ Attempts     │ Completed     │
├──────────────┴──────────────┴───────────────┤
│ Game Activity Chart                          │
├──────────────────────┬──────────────────────┤
│ Pending Reviews      │ Recent Audit Logs     │
└──────────────────────┴──────────────────────┘
```

指标 API：

```txt
GET /api/admin/dashboard/overview
GET /api/admin/dashboard/activity
GET /api/admin/dashboard/recent-audit-logs
GET /api/admin/dashboard/system-health
```

---

## 12. 用户管理

### 12.1 用户列表

路径：

```txt
/admin/users
```

功能：

1. 分页查看用户。
2. 搜索用户名、邮箱、ID。
3. 按状态筛选：
   - ACTIVE
   - BANNED
   - DELETED
4. 按角色筛选。
5. 按注册时间筛选。
6. 按最近登录时间筛选。
7. 查看挑战次数、完成次数、最高排名等摘要。
8. 批量封禁，谨慎开放，仅 SUPER_ADMIN / ADMIN。
9. 导出用户列表，受权限控制。

表格字段：

```txt
User ID
Username
Email
Status
Roles
Created At
Last Login At
Attempts
Completed
Actions
```

API：

```txt
GET /api/admin/users
```

Query：

```ts
interface AdminListUsersQuery {
  keyword?: string;
  status?: "ACTIVE" | "BANNED" | "DELETED";
  roleKey?: string;
  createdFrom?: string;
  createdTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "lastLoginAt" | "attempts" | "completed";
  sortOrder?: "asc" | "desc";
}
```

---

### 12.2 用户详情

路径：

```txt
/admin/users/:userId
```

分区：

1. 基本信息。
2. 角色权限。
3. 登录会话。
4. 挑战记录。
5. 排行榜成绩。
6. 操作日志。
7. 管理备注。

可执行操作：

1. 修改用户名，谨慎。
2. 修改头像，谨慎。
3. 封禁用户。
4. 解封用户。
5. 撤销所有会话。
6. 分配角色。
7. 移除角色。
8. 查看用户最近 attempt。
9. 查看用户排行榜记录。

禁止操作：

1. 查看用户密码。
2. 手动设置明文密码。
3. 无审计地修改用户数据。

---

### 12.3 用户权限管理

路径：

```txt
/admin/users/:userId/permissions
```

功能：

1. 查看用户拥有的角色。
2. 查看角色展开后的权限。
3. 分配角色。
4. 移除角色。
5. 查看权限来源。

UI：

```txt
User: alice

Roles:
[ADMIN] [PUZZLE_REVIEWER]

Effective Permissions:
users:read
games:update
puzzles:publish
...
```

---

### 12.4 用户会话管理

路径：

```txt
/admin/users/:userId/sessions
```

字段：

```txt
Session ID
IP
User Agent
Created At
Last Used At
Expires At
Revoked At
Revoked Reason
Actions
```

操作：

1. 撤销单个 session。
2. 撤销全部 session。
3. 查看异常登录记录，后续扩展。

API：

```txt
GET /api/admin/users/:userId/sessions
POST /api/admin/users/:userId/sessions/:sessionId/revoke
POST /api/admin/users/:userId/sessions/revoke-all
```

---

## 13. 角色与权限管理

### 13.1 角色列表

路径：

```txt
/admin/roles
```

功能：

1. 查看角色。
2. 创建自定义角色。
3. 编辑角色名称、描述。
4. 配置角色权限。
5. 禁止删除 system role。
6. 查看角色关联用户数量。

---

### 13.2 权限列表

路径：

```txt
/admin/permissions
```

权限通常由系统 seed 创建，不建议 UI 任意新增。

功能：

1. 查看所有权限。
2. 按 resource 筛选。
3. 查看哪些角色拥有该权限。

权限新增应通过代码和 seed 管理，而不是后台随意添加。

---

## 14. 游戏管理

### 14.1 游戏列表

路径：

```txt
/admin/games
```

功能：

1. 查看所有游戏。
2. 搜索游戏名称、slug。
3. 按状态筛选：
   - DRAFT
   - PUBLISHED
   - ARCHIVED
4. 按标签、能力维度筛选。
5. 创建游戏。
6. 编辑游戏。
7. 发布游戏。
8. 归档游戏。
9. 进入该游戏题库管理。
10. 进入该游戏排行榜管理。

表格字段：

```txt
Game ID
Title
Slug
Status
Difficulty Count
Puzzle Count
Published At
Updated At
Actions
```

---

### 14.2 游戏详情 / 编辑

路径：

```txt
/admin/games/:gameId
/admin/games/:gameId/edit
```

通用字段：

```ts
interface AdminGameForm {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  source?: string;
  coverUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  tags: string[];

  dimensions: Array<{
    key: string;
    label: string;
    value: number;
  }>;

  difficultyLevels: Array<{
    key: string;
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  }>;

  visual: {
    accentColor?: string;
    icon?: string;
    backgroundPattern?: string;
  };

  metadata: Record<string, unknown>;
}
```

#### 预留空白区域

具体每个游戏后续需要配置的特殊信息，统一放在：

```txt
Game Specific Config
```

数据结构：

```ts
interface GameSpecificAdminConfig {
  gameSlug: string;
  schemaVersion: number;
  config: Record<string, unknown>;
}
```

页面上保留：

```txt
┌────────────────────────────────────┐
│ Game Specific Config               │
│                                    │
│ 当前游戏的专属配置字段后续补充。       │
│                                    │
│ [Reserved Form Area]               │
└────────────────────────────────────┘
```

示例：

```txt
数字华容道：棋盘尺寸、scrambleMoves
生命游戏：boundary rule、maxGenerations
绝对指令：迷宫层数、尺寸、题目校验规则
精准造字：字根库、部首库、组合字典
```

当前阶段不需要实现具体字段，只需要保留扩展位。

---

### 14.3 游戏发布流程

游戏状态流转：

```txt
DRAFT → PUBLISHED → ARCHIVED
ARCHIVED → DRAFT
```

规则：

1. 只有 PUBLISHED 游戏在玩家端可见。
2. 发布前必须通过校验：
   - slug 唯一。
   - title 非空。
   - difficultyLevels 非空。
   - leaderboard definitions 已配置。
   - 如果游戏需要题库，则至少存在一个可用题目。
3. ARCHIVED 游戏不能开始新 attempt。
4. 已有历史成绩和 attempt 不删除。

---

## 15. 题库管理

题库是 Admin 系统最重要的扩展点。

### 15.1 题库列表

路径：

```txt
/admin/games/:gameId/puzzles
```

或：

```txt
/admin/puzzles?gameSlug=life-game
```

功能：

1. 查看某游戏所有题目。
2. 搜索题目 ID、标题、标签。
3. 按状态筛选。
4. 按难度筛选。
5. 按创建人筛选。
6. 按审核状态筛选。
7. 创建题目。
8. 编辑题目。
9. 复制题目。
10. 归档题目。
11. 导入题目。
12. 导出题目。
13. 预览题目。
14. 运行题目校验。
15. 提交审核。
16. 审核发布。

---

### 15.2 通用 Puzzle 模型

不同游戏题目结构差异很大，因此使用通用表 + JSONB 内容。

```prisma
model Puzzle {
  id             String   @id @default(cuid())
  gameId         String
  slug           String?
  title          String?
  difficultyKey  String
  status         String   @default("DRAFT")

  content        Json
  answer         Json?
  validation     Json     @default("{}")
  metadata       Json     @default("{}")

  version        Int      @default(1)
  parentId       String?

  createdById    String?
  updatedById    String?
  reviewedById   String?

  submittedAt    DateTime?
  reviewedAt     DateTime?
  publishedAt    DateTime?
  archivedAt     DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  game           Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@index([gameId, difficultyKey, status])
  @@index([createdById])
  @@index([reviewedById])
  @@index([createdAt])
}
```

字段说明：

| 字段 | 含义 |
|---|---|
| `content` | 题面数据，例如棋盘、迷宫、文字池 |
| `answer` | 标准答案，禁止返回玩家端 |
| `validation` | 校验结果、复杂度评分、可解性信息 |
| `metadata` | 标签、来源、备注 |
| `version` | 题目版本 |
| `parentId` | 复制或修订来源 |
| `status` | 题目状态 |

---

### 15.3 Puzzle 状态流转

```txt
DRAFT
  ↓ submit
PENDING_REVIEW
  ↓ approve
PUBLISHED
  ↓ archive
ARCHIVED

PENDING_REVIEW
  ↓ reject
REJECTED
  ↓ edit
DRAFT
```

状态定义：

| 状态 | 含义 |
|---|---|
| `DRAFT` | 草稿，可编辑，不进入玩家题库 |
| `PENDING_REVIEW` | 待审核，不可随意修改 |
| `REJECTED` | 审核驳回，可修改后重新提交 |
| `PUBLISHED` | 已发布，可被玩家挑战 |
| `ARCHIVED` | 已归档，不再出题 |
| `DISABLED` | 临时禁用，通常用于问题题目 |

---

### 15.4 游戏专属题库字段预留

题库编辑页面结构：

```txt
Basic Info
  - title
  - difficulty
  - tags
  - status

Game Specific Puzzle Content
  - Reserved Dynamic Form Area

Answer / Solution
  - Reserved Dynamic Answer Area

Validation
  - Run Validator
  - Validation Result

Review
  - Submit for Review
  - Approve / Reject
```

其中：

```txt
Game Specific Puzzle Content
Answer / Solution
Validation
```

由不同游戏注册自己的 Admin Puzzle Editor。

接口：

```ts
export interface AdminPuzzleEditorRegistryItem {
  gameSlug: string;
  ContentEditor: React.ComponentType<AdminPuzzleContentEditorProps>;
  AnswerEditor: React.ComponentType<AdminPuzzleAnswerEditorProps>;
  Preview: React.ComponentType<AdminPuzzlePreviewProps>;
  ValidatorPanel: React.ComponentType<AdminPuzzleValidatorPanelProps>;
}
```

当前没有具体管理字段时，显示空白占位：

```txt
该游戏的题库编辑字段尚未配置。
请在后续需求中补充具体字段。
```

---

### 15.5 题库导入导出

支持格式：

```txt
JSON
CSV，部分简单题型
ZIP，后续包含素材
```

导入流程：

```txt
上传文件
  ↓
解析
  ↓
结构校验
  ↓
游戏专属 validator 校验
  ↓
预览导入结果
  ↓
确认导入
  ↓
写入 Puzzle 表
  ↓
记录审计日志
```

导出流程：

```txt
选择游戏 / 难度 / 状态
  ↓
生成导出文件
  ↓
记录审计日志
  ↓
下载
```

注意：

1. 导出是否包含 answer 必须受权限控制。
2. 默认导出不包含 answer。
3. 只有 `puzzles:export` 且具备高级权限的管理员可以导出答案。

---

## 16. 排行榜管理

### 16.1 排行榜定义管理

路径：

```txt
/admin/games/:gameId/leaderboards
```

功能：

1. 查看该游戏所有排行榜。
2. 创建排行榜定义。
3. 修改排行榜名称。
4. 修改排序规则。
5. 修改 tie-breaker。
6. 启用 / 禁用排行榜。
7. 重新计算排行榜。
8. 查看排行榜条目。

LeaderboardDefinition 表可扩展：

```prisma
model LeaderboardDefinition {
  id             String   @id @default(cuid())
  gameId         String
  slug           String   @unique
  name           String
  scope          String
  difficultyKey  String?
  rankMetric     String
  rankDirection  String
  tieBreakers    Json
  entryPolicy    String
  status         String   @default("ACTIVE")
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

### 16.2 排行榜条目管理

路径：

```txt
/admin/leaderboards/:leaderboardId/entries
```

功能：

1. 查看条目。
2. 搜索用户。
3. 查看对应 attempt。
4. 标记异常。
5. 使某条成绩失效。
6. 恢复成绩，限 SUPER_ADMIN。
7. 重新计算排名。

不要物理删除排行榜条目。使用状态：

```txt
ACTIVE
INVALIDATED
SUSPICIOUS
HIDDEN
```

---

## 17. 挑战记录管理

路径：

```txt
/admin/attempts
/admin/attempts/:attemptId
```

功能：

1. 查看所有 attempt。
2. 按用户、游戏、难度、状态筛选。
3. 查看提交记录。
4. 查看 replay 数据。
5. 查看服务端判定结果。
6. 标记异常。
7. 使 attempt 无效。
8. 恢复 attempt，限 SUPER_ADMIN。
9. 查看该 attempt 是否参与排行榜。

表格字段：

```txt
Attempt ID
User
Game
Difficulty
Status
Started At
Completed At
Duration
Metrics
Suspicious
Actions
```

详情页：

```txt
Basic Info
Metrics
Initial State
Move Trace / Submission Trace
Validation Result
Leaderboard Impact
Audit Timeline
```

---

## 18. 数据库管理 / 运维管理

### 18.1 原则

Admin 后台不应设计成通用数据库客户端。

不要让普通管理员直接执行任意 SQL。

数据库管理应定位为：

```txt
受控运维面板
```

提供安全、可审计、有限能力。

---

### 18.2 数据库 Overview

路径：

```txt
/admin/database
```

展示：

1. 数据库连接状态。
2. PostgreSQL 版本。
3. 当前 schema 版本。
4. Prisma migration 状态。
5. 表数量。
6. 核心表记录数。
7. 最近备份时间。
8. 数据库大小。
9. 慢查询摘要，后续可选。
10. Redis 连接状态。

---

### 18.3 Migrations

路径：

```txt
/admin/database/migrations
```

功能：

1. 查看 migration 列表。
2. 查看 applied 时间。
3. 查看当前版本。
4. 检查是否有 pending migration。

不建议在 UI 中直接执行 migration。生产 migration 应通过 CI/CD。

---

### 18.4 Backups

路径：

```txt
/admin/database/backups
```

功能：

1. 查看备份列表。
2. 手动触发备份，限 SUPER_ADMIN。
3. 下载备份，强权限控制。
4. 查看备份大小、耗时、状态。
5. 恢复备份不在普通 UI 提供，避免误操作。

备份任务建议异步执行：

```txt
Admin Click Backup
  ↓
Create MaintenanceJob
  ↓
Queue Worker Execute
  ↓
Update Status
  ↓
Write Audit Log
```

---

### 18.5 Data Export

路径：

```txt
/admin/database/export
```

支持受控导出：

1. 用户数据摘要。
2. 游戏元数据。
3. 题库数据。
4. 排行榜数据。
5. 挑战记录。

每种导出必须声明是否包含敏感数据。

默认不导出：

```txt
passwordHash
refreshTokenHash
session
private audit metadata
```

---

### 18.6 Read-only Query，后续可选

仅 SUPER_ADMIN 可用。

限制：

1. 只允许 SELECT。
2. 必须加 LIMIT。
3. 超时时间限制。
4. 返回行数限制。
5. 记录完整审计日志。
6. 禁止访问敏感字段，或对敏感字段脱敏。

如果不是必要，MVP 不实现 SQL 查询面板。

---

## 19. 系统设置

路径：

```txt
/admin/settings
```

可管理：

1. 站点开关。
2. 注册开关。
3. 排行榜显示开关。
4. 题库维护模式。
5. 游戏维护模式。
6. 全局公告。
7. 默认主题。
8. 管理端安全策略，后续扩展。

SystemSetting 模型：

```prisma
model SystemSetting {
  id           String   @id @default(cuid())
  key          String   @unique
  value        Json
  description  String?
  updatedById  String?
  updatedAt    DateTime @updatedAt
  createdAt    DateTime @default(now())
}
```

---

## 20. Admin API 路由设计

统一前缀：

```txt
/api/admin
```

### Dashboard

```txt
GET /api/admin/dashboard/overview
GET /api/admin/dashboard/activity
GET /api/admin/dashboard/system-health
```

### Users

```txt
GET    /api/admin/users
GET    /api/admin/users/:userId
PATCH  /api/admin/users/:userId
POST   /api/admin/users/:userId/ban
POST   /api/admin/users/:userId/unban
GET    /api/admin/users/:userId/sessions
POST   /api/admin/users/:userId/sessions/:sessionId/revoke
POST   /api/admin/users/:userId/sessions/revoke-all
GET    /api/admin/users/:userId/attempts
GET    /api/admin/users/:userId/leaderboard-entries
```

### Roles / Permissions

```txt
GET    /api/admin/roles
POST   /api/admin/roles
GET    /api/admin/roles/:roleId
PATCH  /api/admin/roles/:roleId
DELETE /api/admin/roles/:roleId

GET    /api/admin/permissions
POST   /api/admin/users/:userId/roles
DELETE /api/admin/users/:userId/roles/:roleId
```

### Games

```txt
GET    /api/admin/games
POST   /api/admin/games
GET    /api/admin/games/:gameId
PATCH  /api/admin/games/:gameId
POST   /api/admin/games/:gameId/publish
POST   /api/admin/games/:gameId/archive
```

### Puzzles

```txt
GET    /api/admin/puzzles
POST   /api/admin/puzzles
GET    /api/admin/puzzles/:puzzleId
PATCH  /api/admin/puzzles/:puzzleId
POST   /api/admin/puzzles/:puzzleId/submit-review
POST   /api/admin/puzzles/:puzzleId/approve
POST   /api/admin/puzzles/:puzzleId/reject
POST   /api/admin/puzzles/:puzzleId/publish
POST   /api/admin/puzzles/:puzzleId/archive
POST   /api/admin/puzzles/:puzzleId/validate
POST   /api/admin/puzzles/import
POST   /api/admin/puzzles/export
```

### Leaderboards

```txt
GET    /api/admin/leaderboards
POST   /api/admin/leaderboards
GET    /api/admin/leaderboards/:leaderboardId
PATCH  /api/admin/leaderboards/:leaderboardId
GET    /api/admin/leaderboards/:leaderboardId/entries
POST   /api/admin/leaderboards/:leaderboardId/recalculate
POST   /api/admin/leaderboard-entries/:entryId/invalidate
POST   /api/admin/leaderboard-entries/:entryId/restore
```

### Attempts

```txt
GET    /api/admin/attempts
GET    /api/admin/attempts/:attemptId
POST   /api/admin/attempts/:attemptId/invalidate
POST   /api/admin/attempts/:attemptId/restore
```

### Database

```txt
GET    /api/admin/database/overview
GET    /api/admin/database/migrations
GET    /api/admin/database/backups
POST   /api/admin/database/backups
POST   /api/admin/database/export
```

### Audit

```txt
GET    /api/admin/audit-logs
GET    /api/admin/audit-logs/:auditLogId
```

---

## 21. 数据表格规范

后台大量页面依赖 DataTable，必须设计成通用组件。

### 21.1 DataTable 功能

必须支持：

1. 服务端分页。
2. 服务端排序。
3. 服务端筛选。
4. 搜索。
5. 列显示/隐藏。
6. 行操作。
7. 批量操作。
8. loading 状态。
9. empty 状态。
10. error 状态。
11. URL query 同步筛选条件。
12. 大数据量下不一次性拉全量。

### 21.2 分页策略

默认：

```txt
pageSize = 20
可选 20 / 50 / 100
```

大量数据推荐 keyset pagination，但 MVP 可先使用 offset pagination。

---

## 22. 安全设计

### 22.1 管理端认证

管理端登录可以复用现有登录系统，但需要增加：

1. AdminRouteGuard。
2. PermissionGuard。
3. 管理端 session 风险提示。
4. 后续 MFA 扩展位。
5. 管理端 access token TTL 可更短。

推荐：

```txt
玩家端 access token TTL: 15 min
管理端 access token TTL: 10 min
```

Refresh token 可共用，但后台关键操作需要重新确认密码或二次验证，后续扩展。

---

### 22.2 高危操作确认

以下操作必须二次确认：

1. 封禁用户。
2. 分配 SUPER_ADMIN。
3. 撤销全部用户会话。
4. 发布游戏。
5. 批量归档题目。
6. 作废排行榜成绩。
7. 触发数据库备份。
8. 导出包含答案的数据。
9. 修改系统设置。

确认弹窗必须展示：

```txt
操作对象
影响范围
不可逆风险
需要输入确认文本，部分操作
```

例如：

```txt
请输入 ARCHIVE 确认归档该题目。
```

---

### 22.3 审计不可绕过

原则：

1. 写操作必须记录 audit log。
2. 批量操作必须记录每个资源的影响，或记录 affectedIds。
3. 审计日志不能被普通管理员删除。
4. 审计日志只允许 SUPER_ADMIN 查看完整内容。
5. 审计日志中不要记录明文 token、密码、敏感密钥。

---

## 23. 性能设计

1. 所有列表接口必须分页。
2. 用户、题目、attempt、audit log 必须建立索引。
3. Dashboard 聚合数据可以使用缓存。
4. 大型导入导出使用异步任务。
5. 题库校验可能耗时，应走 job queue。
6. 管理端表格使用虚拟滚动，后续可选。
7. 游戏专属预览组件需要懒加载，避免 admin 首屏过大。

---

## 24. 异步任务设计

后续需要引入 job 系统，例如 BullMQ + Redis。

任务类型：

```txt
PUZZLE_IMPORT
PUZZLE_VALIDATE
PUZZLE_EXPORT
LEADERBOARD_RECALCULATE
DATABASE_BACKUP
DATA_EXPORT
AUDIT_EXPORT
```

MaintenanceJob 模型：

```prisma
model MaintenanceJob {
  id           String   @id @default(cuid())
  type         String
  status       String   @default("PENDING")
  progress     Int      @default(0)
  payload      Json     @default("{}")
  result       Json?
  error        String?
  createdById  String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([type, status])
  @@index([createdById])
  @@index([createdAt])
}
```

---

## 25. 游戏专属 Admin 扩展机制

每个游戏可以注册自己的后台扩展。

```ts
export interface AdminGameExtension {
  gameSlug: string;

  PuzzleContentEditor?: React.ComponentType<PuzzleContentEditorProps>;
  PuzzleAnswerEditor?: React.ComponentType<PuzzleAnswerEditorProps>;
  PuzzlePreview?: React.ComponentType<PuzzlePreviewProps>;
  PuzzleValidatorPanel?: React.ComponentType<PuzzleValidatorPanelProps>;

  AttemptReplayViewer?: React.ComponentType<AttemptReplayViewerProps>;
  LeaderboardMetricRenderer?: React.ComponentType<LeaderboardMetricRendererProps>;

  GameSpecificSettings?: React.ComponentType<GameSpecificSettingsProps>;
}
```

注册：

```ts
export const adminGameExtensions: Record<string, AdminGameExtension> = {
  "sliding-puzzle": slidingPuzzleAdminExtension,
  "life-game": lifeGameAdminExtension,
  "absolute-command": absoluteCommandAdminExtension,
  "precise-character-building": preciseCharacterBuildingAdminExtension,
};
```

如果某游戏没有注册扩展，则后台显示通用 JSON 编辑器和 JSON 预览器。

---

## 26. Admin 前端路由守卫

状态：

```ts
type AdminAuthStatus =
  | "bootstrapping"
  | "authenticated"
  | "forbidden"
  | "anonymous";
```

路由守卫：

```tsx
function AdminProtectedRoute({ permission, children }) {
  const { status, permissions } = useAdminAuthStore();

  if (status === "bootstrapping") {
    return <AdminFullPageLoading />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  if (!permissions.includes(permission)) {
    return <AdminForbiddenPage />;
  }

  return children;
}
```

注意：

前端权限控制只用于隐藏 UI，不作为安全边界。

---

## 27. Admin 登录入口设计

玩家端可以保留管理入口，但只对管理员可见：

```txt
User Menu
  ├── Profile
  ├── Settings
  └── Admin Console
```

入口显示条件：

```ts
user.permissions.includes("admin:access")
```

但隐藏入口不是安全策略。即使普通用户访问：

```txt
https://admin.superbrain.example.com
```

也必须由后端权限拒绝。

---

## 28. 主题与 UI 风格

管理端 UI 和之前游戏前台保持同一套 SuperBrain 视觉体系：

1. 使用相同 design tokens。
2. 支持 light/dark/neon theme。
3. 顶部导航、按钮、卡片、Badge 风格一致。
4. 管理端更强调信息密度、表格、筛选器和状态标记。
5. 不重复设计玩家端已有的基础 UI 规范。

管理端特殊要求：

1. 表格密度更高。
2. 操作按钮必须区分危险等级。
3. 状态 Badge 要清晰。
4. JSON 查看器要可折叠。
5. 高危操作使用确认弹窗。
6. 页面必须有 breadcrumb。

---

## 29. 实现顺序

### Step 1：工程拆分

1. 新建 `apps/admin`。
2. 抽出 `packages/ui`，复用基础组件和 design tokens。
3. 配置 admin dev port 为 5174。
4. 配置 admin API client。

### Step 2：权限模型

1. 新增 Role、Permission、UserRole、RolePermission 表。
2. seed 内置角色和权限。
3. 给初始管理员分配 SUPER_ADMIN。
4. 实现 PermissionService。

### Step 3：Admin Auth

1. 实现 AdminAuthGuard。
2. 实现 PermissionGuard。
3. 实现 `/api/admin/me`。
4. 实现前端 AdminProtectedRoute。
5. 实现权限菜单过滤。

### Step 4：审计日志

1. 新增 AdminAuditLog 表。
2. 实现 AuditService。
3. 实现 AdminAuditInterceptor。
4. 先接入用户、游戏、题库写操作。

### Step 5：用户管理

1. 用户列表。
2. 用户详情。
3. 角色分配。
4. 封禁 / 解封。
5. session 撤销。

### Step 6：游戏管理

1. 游戏列表。
2. 游戏详情。
3. 游戏创建 / 编辑。
4. 游戏发布 / 归档。
5. Game Specific Config 占位。

### Step 7：题库管理

1. 通用 Puzzle 表。
2. 题库列表。
3. 题库创建 / 编辑。
4. 题库状态流转。
5. 题库导入导出占位。
6. 游戏专属编辑器注册机制。

### Step 8：排行榜与挑战记录

1. 排行榜定义管理。
2. 排行榜条目查看。
3. 成绩作废。
4. Attempt 列表和详情。
5. Submission / Replay 查看占位。

### Step 9：数据库管理

1. Overview。
2. Migration 状态查看。
3. Backup job 占位。
4. Data export 占位。
5. 只读查询暂不实现或仅 SUPER_ADMIN。

### Step 10：Dashboard

1. 管理首页指标。
2. 最近审计日志。
3. 待审核题目。
4. 系统健康状态。

---

## 30. 验收标准

完成后必须满足：

1. 玩家端和管理端工程分离。
2. 管理端可以独立启动。
3. 普通用户无法访问任何 admin API。
4. 管理员登录后能进入 Admin Console。
5. 权限不足时前端显示 Forbidden，后端返回 403。
6. 用户列表支持搜索、筛选、分页。
7. 用户详情能查看角色、会话、挑战记录。
8. 管理员可以封禁 / 解封用户，并产生审计日志。
9. SUPER_ADMIN 可以分配和移除角色。
10. 游戏列表可以查看所有游戏，包括 DRAFT 和 ARCHIVED。
11. 游戏编辑页保留 Game Specific Config 空白区域。
12. 题库列表可以按游戏、难度、状态筛选。
13. 题库编辑页保留游戏专属内容和答案编辑区域。
14. 排行榜条目可以查看并标记异常。
15. Attempt 详情可以查看基础信息、metrics、submission/replay 占位。
16. 数据库管理页可以查看数据库状态和 migration 状态。
17. 所有管理端写操作记录 AdminAuditLog。
18. 高危操作有二次确认。
19. 所有列表接口服务端分页。
20. 新增游戏时可以注册自己的 AdminGameExtension，而不修改通用管理页面。
21. 管理端 UI 与 SuperBrain 玩家端风格一致，但更适合后台数据管理。
22. 管理端支持后续主题切换。

---

## 31. 不推荐的实现方式

避免：

1. 只在玩家端隐藏一个 `/admin` 按钮作为权限控制。
2. 只使用 `User.role === ADMIN` 判断所有后台权限。
3. 后台直接暴露数据库任意 SQL 执行。
4. 管理员操作不写审计日志。
5. 物理删除用户、成绩、题目。
6. 每个游戏单独写一套题库管理页面，无法复用。
7. 所有题目字段都塞到固定列，导致新增游戏必须改数据库结构。
8. 玩家端 bundle 包含大量后台编辑器和表格库。
9. 排行榜异常成绩直接删除，不保留记录。
10. 导出数据默认包含答案和敏感字段。

---

## 32. 最终结论

采用：

```txt
apps/admin 独立管理端 + apps/api 共用后端 + /api/admin/* 专属管理接口
```

玩家端中可以保留 Admin Console 入口，但只作为跳转入口：

```txt
User Menu → Admin Console
```

真正的权限边界必须由后端的：

```txt
AdminAuthGuard + PermissionGuard + AdminAuditLog
```

保证。

该方案在当前阶段不会过度拆分后端服务，但已经为后续大量游戏、题库、排行榜、数据审核和运维管理留下足够扩展空间。
