# SuperBrain 身份与授权（Auth & Identity）

> **状态**：Change 2 `introduce-rbac-and-auth-session` 已完成。Auth 模块基于新 Schema 重建，全平台进入 **permission-key 授权** 模型。
> **真理源**：`apps/api/src/auth/`、`apps/api/src/common/{decorators,guards}/`、`apps/api/prisma/seed/{permissions,roles,users}.ts`。

---

## 1. 模型一览

```
User ──┬── AuthSession        (登录会话，refresh-token 哈希 + family rotation)
       └── UserRole ── Role ── RolePermission ── Permission
                       │
                       └─ isSystem=true 表示内置不可删
```

- `User.status: ACTIVE | BANNED | DELETED` — 取代了旧的 `User.role` 二元字段。
- 全部授权派生自 `UserRole → Role → RolePermission → Permission` 联表。
- `Permission.key` 为 `<resource>:<action>` 格式，例如 `puzzle:publish`、`role:assign`。

## 2. 内置角色（8 个）

| key | name | 权限数 | 用途 |
|---|---|---:|---|
| `super_admin` | 超级管理员 | 39（全集） | 拥有全部权限，包括 `role:assign-super-admin` |
| `admin` | 管理员 | 38 | super_admin 减去 `role:assign-super-admin` |
| `puzzle_editor` | 题目编辑 | 11 | `puzzle:*` / `puzzle-version:create` / `puzzle-asset:upload` / `puzzle-tag:manage` |
| `puzzle_reviewer` | 题目审核 | 9 | `puzzle-version:publish` / `puzzle-version:reject` / `review-task:*` |
| `leaderboard_manager` | 排行榜运营 | 6 | `leaderboard:*` / `score-record:revoke` |
| `user_manager` | 用户运营 | 6 | `user:*`（不含 delete-hard）/ `role:assign` |
| `audit_viewer` | 审计员 | 3 | 所有 `*-audit-log:read` + `review-task:read` |
| `readonly_operator` | 只读运营 | 11 | 所有 `:read` 权限 |

完整目录见 `apps/api/prisma/seed/permissions.ts` 中的 `PERMISSION_CATALOG`。

## 3. 权限装饰器

```ts
// 任意权限点（必须全部具备）
@RequirePermission('puzzle:publish')
@Post('puzzles/:id/publish')
publish(...) { ... }

// 任意一个权限即可
@RequireAnyPermission('admin-audit-log:read', 'challenge-audit-log:read')
@Get('audit')
audit() { ... }
```

守卫顺序：`@UseGuards(JwtAuthGuard, PermissionGuard)`。`JwtAuthGuard` 验证 access token 并将 `{ id, sessionId }` 挂到 `req.user`；`PermissionGuard` 通过 `PermissionService.getUserPermissionKeys` 装载用户权限集合并比对装饰器声明。

## 4. AuthSession 生命周期

```
login   ──► ACTIVE (新 familyId)
refresh ──► 旧 ROTATED + 新 ACTIVE (同 family)
logout  ──► REVOKED
expiry  ──► EXPIRED （访问时懒迁移）
重放检测 ──► 整个 family 全部 COMPROMISED
```

- Refresh token：仅在客户端 `httpOnly` cookie，服务端只存 sha256 哈希。
- **30 秒优雅期**：刚 ROTATED 的 session 在 30s 内被重放，不视为攻击；返回最近一次轮换出的 access token，避免 SPA 网络抖动 → 误判。
- 数据库层 `AuthSession.refreshTokenHash` 唯一约束保证哈希永不冲突。

## 5. 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/register` | 注册；返回 `{ user, accessToken }` |
| `POST` | `/api/auth/login` | 登录；5 次/分钟/IP 限流 |
| `POST` | `/api/auth/refresh` | Cookie 鉴权；轮换 refresh token |
| `POST` | `/api/auth/logout` | 撤销当前 session |
| `POST` | `/api/auth/logout-all` | 撤销同用户所有 session |
| `GET`  | `/api/auth/me` | 当前用户 + permissionKeys |
| `GET`  | `/api/admin/users` | 列表（user:read） |
| `GET`  | `/api/admin/users/:id` | 详情含活跃 session（user:read） |
| `POST` | `/api/admin/users/:id/ban` | 封禁（user:ban） |
| `POST` | `/api/admin/users/:id/unban` | 解封（user:ban） |
| `GET`  | `/api/admin/users/:id/roles` | 列出角色（role:read） |
| `POST` | `/api/admin/users/:id/roles` | 分配角色（role:assign；分配 super_admin 还需 role:assign-super-admin） |
| `DELETE` | `/api/admin/users/:id/roles/:roleKey` | 撤销角色（role:assign） |
| `GET`  | `/api/admin/roles` | 角色 + 权限映射（role:read） |
| `POST` | `/api/admin/roles` | 新建角色（role:assign） |
| `PATCH`  | `/api/admin/roles/:id` | 编辑（role:assign-super-admin） |
| `DELETE` | `/api/admin/roles/:id` | 删除（role:assign-super-admin；isSystem 拒绝） |
| `GET`  | `/api/admin/permissions` | 权限目录（role:read） |
| `GET`  | `/api/admin/audit-logs` | 审计日志（admin-audit-log:read） |

## 6. UserSchema（前端契约）

```ts
{
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'BANNED' | 'DELETED';
  permissionKeys: string[];   // 已扁平化的权限集合
}
```

前端权限判断：`user.permissionKeys.includes('puzzle:publish')`。不再使用 `user.role === 'ADMIN'`。

## 7. 演示账户（开发环境）

| 邮箱 | 用户名 | 密码 | 角色 |
|---|---|---|---|
| `super_admin@example.com` | `superadmin` | `Demo123456` | `super_admin` |
| `demo@example.com` | `demo` | `Demo123456` | `admin` |

由 `apps/api/prisma/seed/users.ts` 幂等 upsert。

## 8. 添加新权限

1. 在 `apps/api/prisma/seed/permissions.ts` 的 `PERMISSION_CATALOG` 末尾追加 `{ key, resource, action, description }`。
2. 如需把新权限并入某个内置角色，在 `apps/api/prisma/seed/roles.ts` 中相应 role 的 `permissionKeys` 数组里加上 key。
3. 重跑 `pnpm api -- prisma db seed`（幂等）。
4. 在端点加 `@RequirePermission('your:new-key')`。

## 9. 已知限制 / 未做事项

- 没有 SPA 端 RBAC 管理 UI（创建/分配角色等）— 简单 CLI/数据库直接编辑可顶替到 Change 4 admin 整体改造时一起补。
- `PermissionService` 没有跨请求缓存。Change 6 在高并发场景会改用 Redis 缓存。
- `@nestjs/throttler` 仍是内存版；Change 6 切换到 Redis storage。
- 无 OAuth/2FA、密码重置邮件、session 设备管理 UI（均已记录在 `design.md` Non-Goals）。

## 10. 后续 change 中 Auth 的演进

| Change | 影响 |
|---|---|
| Change 3 | `JwtAuthGuard + PermissionGuard` 被 `ChallengesController` 复用 |
| Change 4 | admin SPA 加入 RBAC 管理页 |
| Change 6 | 限流改 Redis storage；PermissionService 加 Redis 缓存 |
