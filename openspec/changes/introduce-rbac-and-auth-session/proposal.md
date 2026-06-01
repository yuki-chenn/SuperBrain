# Proposal — introduce-rbac-and-auth-session

## Why

Change 1 (`redesign-database-schema-greenfield`) reset the schema with full RBAC tables (`Role`/`Permission`/`UserRole`/`RolePermission`) and renamed `Session` to `AuthSession`, but the NestJS auth/users/admin modules are still excluded from compilation because they reference the removed `User.role` enum and `Session` model. The platform currently has no working login or authorization.

We now rebuild the auth layer on top of the new schema so:

- Users can register / login / refresh / logout.
- Authorization is permission-key based (`@RequirePermission('puzzle:publish')`), not a binary `USER/ADMIN` check.
- Admin endpoints enforce per-permission guards backed by the 8 seeded roles.
- Refresh-token rotation uses `AuthSession.refreshTokenFamilyId` with `AuthSessionStatus` lifecycle.
- The 6 demo admin users created at seed time can sign in via the 8 system roles.

This is a prerequisite for Change 3 (`introduce-challenge-runtime-gateway`) which will mount under the new auth guard.

## What Changes

- **BREAKING** Replace `JwtStrategy` and `AuthService` callers to no longer read `User.role`. Authorization derives from the `userRoles → role → rolePermissions → permission` join.
- **BREAKING** Replace `SessionService` with `AuthSessionService`. Refresh tokens are stored as hash + family ID in `AuthSession`; rotation marks the previous row `ROTATED` and the new row points back via `replacedBySessionId`; reuse of a `ROTATED` or `REVOKED` token marks the entire family `COMPROMISED` and forces re-login.
- Add `PermissionService` that loads a user's effective permission keys (cached per request) by joining `userRoles → rolePermissions → permission`.
- Add `@RequirePermission(...keys)` and `@RequireAnyPermission(...keys)` decorators + `PermissionGuard` that integrates with `JwtAuthGuard`.
- Add `RolesController` and `UsersController` under `apps/api/src/admin/` exposing the new RBAC management endpoints (list roles, list permissions, assign role to user, revoke role, change role's permission set — gated by `role:*` permissions).
- Add `MeController` (or extend existing `AuthController`) so the SPA can fetch the current user's permission keys for client-side guard hints.
- Rewrite `apps/api/src/auth/auth.module.ts`, `auth.service.ts`, `cookie.service.ts`, `token.service.ts`, `jwt.strategy.ts` against the new Prisma client.
- Rewrite `apps/api/src/users/users.service.ts` / `users.module.ts`.
- Rewrite `apps/api/src/admin/admin-users.service.ts` and `admin-users.controller.ts` to use Role/Permission joins.
- Update `apps/api/src/admin/admin.module.ts` to register the new RBAC controllers and drop dead references to removed Prisma types.
- Update `apps/api/tsconfig.json` to **remove** `src/auth`, `src/users`, `src/admin`, `src/common` from `exclude`; keep `games/attempts/leaderboards` excluded until later changes.
- Update `apps/api/src/app.module.ts` to import `AuthModule`, `UsersModule`, `AdminModule` again.
- Extend `apps/api/prisma/seed/games.ts` (or add `seed/users.ts`) to seed two baseline accounts (`super_admin@example.com` and `demo@example.com`) with the matching roles.
- Update `@brain-games/shared` auth schemas: `UserSchema.role` (legacy enum) replaced by `UserSchema.permissionKeys: string[]`; `AuthResponseSchema` carries `permissionKeys` so the SPA can render menus.
- Update the admin SPA (`apps/admin/src/`) login flow and permission-gating wrappers to consume the new `permissionKeys` shape.

## Capabilities

### New Capabilities

- `rbac`: Role/Permission/UserRole/RolePermission management surface (admin endpoints, permission key catalog, role catalog, assign/revoke flows).

### Modified Capabilities

- `auth`: Rebuilt against `AuthSession`; refresh-token rotation, family compromise detection, permission-key emission on login.

## Impact

- `apps/api/src/auth/*` (rewrite)
- `apps/api/src/users/*` (rewrite)
- `apps/api/src/admin/admin-users.*` (rewrite); add `admin-roles.controller.ts`, `admin-permissions.controller.ts`
- `apps/api/src/common/decorators/` + `src/common/guards/` (add `@RequirePermission` + `PermissionGuard`)
- `apps/api/src/app.module.ts`, `apps/api/tsconfig.json`
- `apps/api/prisma/seed/users.ts` (new), `apps/api/prisma/seed.ts` (extend orchestrator)
- `packages/shared/src/schemas/auth.ts` (replace `role` field with `permissionKeys`)
- `apps/admin/src/features/auth/`, `apps/admin/src/stores/` (consume new schema)
- `docs/Overview-Auth-Identity.md` (new)

**Out of scope**: challenge/attempt modules (Change 3), game-specific modules (Changes 4/7), leaderboard pipeline (Change 5), workers (Change 6).
