# Design — introduce-rbac-and-auth-session

## Context

The greenfield schema reset provides `User` (no `role` field, `status: UserStatus`), `AuthSession` (`status: AuthSessionStatus`, family ID, refresh-token hash), and the four RBAC tables (`Role`, `Permission`, `UserRole`, `RolePermission`) with 8 system roles + 39 permission keys seeded.

The existing auth code (excluded from compilation since Change 1) used:
- A single `User.role` enum (`USER`/`ADMIN`).
- A `Session` model storing refresh tokens directly.
- `JwtAuthGuard + AdminGuard` (binary check on `user.role === 'ADMIN'`).

We replace it with a permission-key model where every protected endpoint declares the keys it needs and the guard validates against the user's flattened permission set.

## Goals / Non-Goals

**Goals**
- Restore working register/login/refresh/logout endpoints.
- Permission-key based authorization with `@RequirePermission(...)` decorator.
- Refresh-token rotation with reuse detection (family compromise).
- Admin endpoints for managing roles, permissions, and user-role assignments.
- SPA receives `permissionKeys: string[]` on login and via `/auth/me`.
- API server compiles end-to-end on the auth/users/admin subset; only games/attempts/leaderboards remain excluded.

**Non-Goals**
- No social login / OAuth / 2FA (deferred).
- No password reset emails (only admin-driven password reset via permission).
- No fine-grained row-level RBAC (per-record ACL) — permission keys are global scope for this change.
- No session listing / device manager UI in this change (data model supports it; UI deferred).
- No challenge / game / leaderboard endpoints.

## Decisions

### D1 — Permission keys are the only authorization primitive

Endpoints declare `@RequirePermission('puzzle:publish')` or `@RequireAnyPermission('puzzle:read', 'leaderboard:read')`. Role membership is never queried at the endpoint layer; the guard joins through the role catalog. This decouples HTTP surface from the role catalog: re-mapping roles to permissions does not require code changes.

Alternative: keep an `AdminGuard` for back-office endpoints. Rejected — the seeded role catalog already covers granular admin operations; a coarse `AdminGuard` would defeat the RBAC investment.

### D2 — Permission set materialized per request

`PermissionService.getUserPermissionKeys(userId)` returns `Set<string>` and is cached on the Nest request scope (via a request-scoped provider) to avoid repeated joins inside a single request. Cross-request caching deferred to Change 6 (Redis cache when scale demands).

### D3 — Refresh token family rotation

```
login         → create AuthSession(status=ACTIVE, familyId=cuid())
refresh OK    → mark old session ROTATED, replacedBySessionId=new.id;
                create new AuthSession(status=ACTIVE, familyId=same)
refresh reuse → if presented token belongs to a ROTATED/REVOKED session,
                set every session in that family status=COMPROMISED;
                return 401 force_reauth
logout        → status=REVOKED, revokedReason='user-logout'
admin revoke  → status=REVOKED, revokedReason='admin-revoke'
expiry        → status=EXPIRED (set by ChallengeReaperWorker in Change 6;
                this change adds an inline check on refresh)
```

### D4 — JWT carries userId + sessionId; permissions resolved per request

Access JWT payload: `{ sub: userId, sid: authSessionId, iat, exp }`. We do **not** stuff permission keys into the JWT because (a) keys change at any moment when admin updates a role and (b) the JWT then bloats unboundedly. The cost is one PermissionService lookup per authenticated request, which is a single indexed query.

### D5 — UserSchema in shared package becomes RBAC-aware

```ts
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'BANNED', 'DELETED']),
  permissionKeys: z.array(z.string()),
});
```

`AuthResponseSchema.user` now embeds `permissionKeys`. Frontend prop drilling unchanged; menu visibility checks now read `user.permissionKeys.includes('puzzle:read')` instead of `user.role === 'ADMIN'`.

### D6 — Seed two baseline accounts

`seed/users.ts` upserts:
- `super_admin@example.com` / username `superadmin` / role `super_admin`
- `demo@example.com` / username `demo` / role `admin`

Password hash uses argon2id with the literal `Demo123456`. Documented in README.

### D7 — Admin RBAC endpoints

```
GET    /api/admin/roles                 → roles + permission keys
POST   /api/admin/roles                 → create (gated by role:assign-super-admin OR role:assign)
PATCH  /api/admin/roles/:id             → rename / permission set change
DELETE /api/admin/roles/:id             → soft delete (only if not isSystem)
GET    /api/admin/permissions           → catalog
GET    /api/admin/users/:id/roles       → list
POST   /api/admin/users/:id/roles       → assign role { roleKey }
DELETE /api/admin/users/:id/roles/:roleKey → revoke
```

System roles (`isSystem=true`) cannot be deleted, but their permission set is editable by `super_admin` only.

### D8 — Cookie strategy unchanged

`accessToken` returned in JSON body; `refreshToken` stays as `httpOnly` cookie set by `CookieService`. SameSite=Lax, Secure off in dev, on in prod. Path scoped to `/api/auth/refresh`.

### D9 — Backward-compat shim for `User.role` references

Any straggler service that still reads `user.role` will fail to compile (TypeScript error) — desired. No runtime shim; we accept the breakage as a forcing function.

### D10 — Throttling

Add `@nestjs/throttler` to `AuthModule` only: 5 login attempts / minute / IP. Storage: in-memory for this change (Redis storage deferred to Change 6).

## Permission Guard Architecture

```
HTTP request
    ↓
[JwtAuthGuard]                ← validates access token, sets req.user.id
    ↓
[PermissionGuard]             ← reads @RequirePermission metadata,
                                resolves req.user.permissionKeys via PermissionService,
                                throws 403 ForbiddenException on miss
    ↓
controller handler
```

Decorator usage:

```ts
@RequirePermission('puzzle:publish')
@Post('puzzles/:id/publish')
publish(@Param('id') id: string) { ... }

@RequireAnyPermission('admin-audit-log:read', 'challenge-audit-log:read')
@Get('audit')
audit() { ... }
```

If no `@RequirePermission` metadata is set but `JwtAuthGuard` succeeded, the request passes (authenticated-only endpoints).

## Risks / Trade-offs

- **[Risk]** Per-request permission lookup adds DB query latency. → **Mitigation**: single indexed query (`@@index([userId])` on `UserRole`); cache in request scope; Redis cache later in Change 6.
- **[Risk]** Family compromise on refresh-token reuse may lock legitimate users out (e.g. SPA double-fires refresh during network flap). → **Mitigation**: 30-second grace window — a refresh request that arrives within 30s of a successful rotation and presents the JUST-rotated token returns the new pair without escalating. Documented in `cookie.service.ts`.
- **[Risk]** Permission keys hard-coded in code may drift from DB catalog. → **Mitigation**: a startup check in `PermissionService.onModuleInit()` warns (does not block) if any `@RequirePermission(...)` key is missing from `Permission` table.
- **[Trade-off]** Two-step gate (Jwt then Permission) adds one guard. → **Accepted**; Nest guard pipeline is cheap.
- **[Trade-off]** No JWT permission caching means revocation is instant (good) at the cost of one extra DB query per request (acceptable).

## Migration Plan

1. Remove `src/auth`, `src/users`, `src/admin`, `src/common` from `tsconfig.json` `exclude`.
2. Implement `PermissionService`, `@RequirePermission` decorator, `PermissionGuard` under `src/common/`.
3. Rewrite `AuthService` (register, login, refresh, logout, validateAccess).
4. Rewrite `AuthSessionService` (create, rotate, revoke, listForUser, family-compromise detection).
5. Rewrite `UsersService` (findById, findByEmail, search, ban, unban, softDelete, assignRole, revokeRole).
6. Rewrite `AdminUsersController` to use Users/Permission services.
7. Add `AdminRolesController` and `AdminPermissionsController`.
8. Extend `apps/api/prisma/seed/` with `users.ts`; register in `seed.ts` orchestrator after `roles`.
9. Update `packages/shared/src/schemas/auth.ts` (`UserSchema.role → permissionKeys`).
10. Update admin SPA (`apps/admin/src/features/auth/`, `stores/`, `lib/api-client.ts`) to consume `permissionKeys`.
11. Wire `AuthModule + UsersModule + AdminModule` back into `AppModule`.
12. Run `pnpm api -- prisma generate && pnpm api -- pnpm build` — auth/users/admin subset must compile.
13. Manual smoke: register a user, login, refresh, hit a `@RequirePermission` endpoint that the seeded `super_admin` has and one it doesn't.

**Rollback**: revert the commit; `prisma migrate reset` rebuilds the prior baseline.

**Verification gate**: `apps/api` builds with `auth/users/admin/common` re-included; login returns `{ accessToken, user: { ..., permissionKeys: [...] } }`; refresh-token reuse triggers family compromise; permission-guarded endpoint returns 403 when user lacks the key.

## Open Questions

1. Should role membership changes invalidate active access tokens immediately? **Adopted**: yes via the per-request permission lookup (no JWT bloat). Access JWT TTL stays short (15 min) so even if PermissionService were to cache, revocation propagates fast.
2. Should `isSystem` roles be deletable by super_admin? **Adopted**: no; only their permission set is editable. Hard delete requires schema migration.
3. Should we emit `WWW-Authenticate` headers on 401? **Adopted**: yes, conforming to bearer auth conventions.
