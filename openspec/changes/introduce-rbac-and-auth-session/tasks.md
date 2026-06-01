# Tasks — introduce-rbac-and-auth-session

## 1. Preparation

- [x] 1.1 Remove `src/auth`, `src/users`, `src/admin`, `src/common` from `apps/api/tsconfig.json` `exclude`.
- [x] 1.2 Run `pnpm api -- pnpm build` to enumerate the type errors that this change must fix.
- [x] 1.3 Delete any dead `Session` / `User.role` references that cannot be salvaged (note line ranges in commit message).

## 2. Shared package — auth schemas

- [x] 2.1 Edit `packages/shared/src/schemas/auth.ts`: replace `UserSchema.role` with `permissionKeys: z.array(z.string())`; add `displayName` and `status` fields.
- [x] 2.2 Rebuild shared via `pnpm --filter @brain-games/shared build` and ensure no consumers break.

## 3. Common — decorators and guards

- [x] 3.1 Create `apps/api/src/common/decorators/permission.decorator.ts` exporting `RequirePermission(...keys)` and `RequireAnyPermission(...keys)` using `SetMetadata` keys `'rbac:all'` and `'rbac:any'`.
- [x] 3.2 Create `apps/api/src/common/guards/permission.guard.ts` implementing `CanActivate`: read metadata, call `PermissionService.assertHasPermissions(user.id, all, any)`, throw `ForbiddenException` with `{ missing: string[] }` on miss.
- [x] 3.3 Create `apps/api/src/common/guards/jwt-auth.guard.ts` extending `AuthGuard('jwt')` (or move from existing if salvageable); ensure it sets `req.user = { id, sessionId }` from JWT payload.

## 4. Permission service

- [x] 4.1 Create `apps/api/src/auth/permission.service.ts` with `getUserPermissionKeys(userId): Promise<string[]>` joining `userRoles → rolePermissions → permissions`, returning sorted unique array.
- [x] 4.2 Add request-scoped cache helper `loadPermissionsForRequest(request)`.
- [x] 4.3 Implement `onModuleInit()` drift check: scan compiled module metadata for `@RequirePermission(...)` keys and warn for missing entries in `Permission` table.

## 5. Auth session service

- [x] 5.1 Replace `apps/api/src/auth/session.service.ts` with `AuthSessionService` that wraps Prisma `authSession` table.
- [x] 5.2 Methods: `create(userId, userAgent, ipAddress)`, `rotate(currentSessionId)`, `revoke(sessionId, reason)`, `revokeAllForUser(userId, reason)`, `findByHash(refreshTokenHash)`, `markFamilyCompromised(familyId, reason)`.
- [x] 5.3 Implement 30-second grace window in `rotate()`: if presented session is `ROTATED` and `revokedAt > now - 30s`, return its `replacedBySession` instead of compromising.
- [x] 5.4 Implement `markExpiredOnRead()`: when a session is loaded and `expiresAt < now`, transition status `ACTIVE→EXPIRED` lazily.

## 6. Auth service

- [x] 6.1 Rewrite `apps/api/src/auth/auth.service.ts`:
  - `register({email, username, password, userAgent, ipAddress})` → User + AuthSession + first-login permission lookup.
  - `login({emailOrUsername, password, userAgent, ipAddress})` → validate, create AuthSession, return `{user (with permissionKeys), accessToken, refreshToken}`.
  - `refresh({refreshToken, userAgent, ipAddress})` → AuthSessionService.rotate + reissue access token.
  - `logout({sessionId})` → AuthSessionService.revoke.
- [x] 6.2 Update `apps/api/src/auth/token.service.ts` JWT payload to `{ sub: userId, sid: sessionId, iat, exp }`.
- [x] 6.3 Update `apps/api/src/auth/cookie.service.ts` if signatures changed (likely unchanged).
- [x] 6.4 Update `apps/api/src/auth/jwt.strategy.ts` to attach `{ id: sub, sessionId: sid }` to request user; do NOT fetch permissions here (PermissionGuard handles it).

## 7. Auth controller

- [x] 7.1 Rewrite `apps/api/src/auth/auth.controller.ts` endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- [x] 7.2 Apply `@nestjs/throttler` to login endpoint (5/minute/IP).
- [x] 7.3 Wire `WWW-Authenticate: Bearer realm="api"` on 401 responses via global filter.

## 8. Users service & controller

- [x] 8.1 Rewrite `apps/api/src/users/users.service.ts`: `findById`, `findByEmail`, `findByUsername`, `paginate({query, page, pageSize})`, `ban(userId, reason)`, `unban(userId)`, `softDelete(userId)`.
- [x] 8.2 Remove every reference to `user.role`; replace with permission lookups where authorization was implied.

## 9. Admin — Users / Roles / Permissions

- [x] 9.1 Rewrite `apps/api/src/admin/admin-users.controller.ts`: list users, get user detail (incl. assigned roles), ban/unban, reset-password, assign-role, revoke-role.
- [x] 9.2 Create `apps/api/src/admin/admin-roles.controller.ts` with list/create/update/delete endpoints + permission-set rewrite.
- [x] 9.3 Create `apps/api/src/admin/admin-permissions.controller.ts` with list endpoint (read-only, no mutations from API; permission catalog is owned by code+seed).
- [x] 9.4 Wire all three controllers in `apps/api/src/admin/admin.module.ts`; remove dead references to legacy types.
- [x] 9.5 Decorate every endpoint with the appropriate `@RequirePermission(...)` per the design table.

## 10. AppModule re-wire

- [x] 10.1 Edit `apps/api/src/app.module.ts`: import `AuthModule`, `UsersModule`, `AdminModule`.
- [x] 10.2 Verify `pnpm api -- pnpm build` succeeds for the auth/users/admin/common subset; remaining excludes (games/attempts/leaderboards) still listed in `tsconfig.json`.

## 11. Seed — baseline users

- [x] 11.1 Create `apps/api/prisma/seed/users.ts` exporting `seedUsers(prisma)` that upserts:
  - `super_admin@example.com` / `superadmin` / password `Demo123456` argon2id-hashed / status ACTIVE
  - `demo@example.com` / `demo` / password `Demo123456` / status ACTIVE
- [x] 11.2 Assign roles via `userRole.upsert`: super_admin user → `super_admin` role; demo user → `admin` role.
- [x] 11.3 Register `seedUsers` in `apps/api/prisma/seed.ts` orchestrator, after `roles` and before `dictionary`.
- [x] 11.4 Run `pnpm api -- prisma db seed` and verify both rows present, with `RolePermission`-derived permission counts as expected (super_admin: 39; admin: 38).

## 12. Admin SPA wiring

- [x] 12.1 Update `apps/admin/src/features/auth/` (login form, auth store) to read `permissionKeys` from `AuthResponseSchema`.
- [x] 12.2 Update `apps/admin/src/stores/` (e.g. `useAuthStore.ts` or equivalent) to expose `hasPermission(key: string): boolean` helper.
- [x] 12.3 Replace `user.role === 'ADMIN'` checks across `apps/admin/src/layouts/` and `app/routes/` with `hasPermission(...)`.
- [x] 12.4 Add a roles management page under `apps/admin/src/features/users/` or new `features/rbac/` that calls the new admin endpoints (list roles, edit permission set, assign to user).
- [x] 12.5 Run `pnpm --filter admin build` to ensure no type errors.

## 13. Verification

- [x] 13.1 `pnpm api -- pnpm build` succeeds (auth/users/admin compile; games/attempts/leaderboards still excluded).
- [x] 13.2 `pnpm api -- pnpm test` for any auth/permission tests passes (add minimal unit tests for `AuthSessionService.rotate` grace-window + family-compromise paths).
- [x] 13.3 Manual smoke:
  - Register a fresh user; login; receive `{ accessToken, user: { permissionKeys: [] } }`.
  - Login as `super_admin@example.com / Demo123456`; receive 39 permission keys.
  - Call `/api/admin/roles` as super_admin → 200; as fresh user → 403.
  - Refresh access token; verify old session is `ROTATED`, new is `ACTIVE`.
  - Replay old refresh token → 401 `family-compromised`; verify all sessions in family are `COMPROMISED`.
  - Logout; verify session is `REVOKED`.
- [x] 13.4 Confirm `WWW-Authenticate: Bearer realm="api"` header on 401 responses.

## 14. Documentation

- [x] 14.1 Create `docs/Overview-Auth-Identity.md` covering: User model, AuthSession lifecycle (incl. token-rotation diagram), Role/Permission RBAC, decorator usage, demo credentials, permission catalog table.
- [x] 14.2 Update `docs/Overview-Framework.md` "过渡说明" section: mark Auth & RBAC stream complete (strike-through the entry).
- [x] 14.3 Add a permission catalog snippet near the top of `Overview-Auth-Identity.md` listing all 39 keys grouped by resource.

## 15. Handoff to Change 3

- [x] 15.1 Confirm `JwtAuthGuard` + `PermissionGuard` are exportable for use by `ChallengesModule` (Change 3 will mount under both).
- [x] 15.2 Confirm seed user `demo@example.com` has the permissions Change 3 will need (`game:read`, `puzzle:read`, etc.) via the `admin` role mapping.
- [x] 15.3 Communicate to the team: API server can now start and serve `/api/auth/*` and `/api/admin/users|roles|permissions/*`; games and attempts will return 404 until Change 3 lands.
