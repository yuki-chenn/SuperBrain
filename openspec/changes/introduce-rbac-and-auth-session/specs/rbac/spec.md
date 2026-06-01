# rbac Capability (delta for change `introduce-rbac-and-auth-session`)

## ADDED Requirements

### Requirement: Permission keys gate every protected endpoint

The system SHALL provide a `@RequirePermission(...keys)` and `@RequireAnyPermission(...keys)` decorator pair plus a `PermissionGuard`. Endpoints decorated with these decorators SHALL be reachable only by users whose effective permission set contains all (or any, respectively) of the listed keys.

#### Scenario: User has required permission
- **WHEN** a user with permission `puzzle:publish` calls a `@RequirePermission('puzzle:publish')` endpoint
- **THEN** the request reaches the controller handler

#### Scenario: User lacks required permission
- **WHEN** a user without permission `puzzle:publish` calls a `@RequirePermission('puzzle:publish')` endpoint
- **THEN** the API returns HTTP 403 with body `{ error: 'forbidden', missing: ['puzzle:publish'] }`

#### Scenario: Any-permission decorator passes on partial match
- **WHEN** a user with only `admin-audit-log:read` calls a `@RequireAnyPermission('admin-audit-log:read', 'challenge-audit-log:read')` endpoint
- **THEN** the request reaches the controller handler

### Requirement: Permission set materialized per request

For each authenticated request the system SHALL load the user's effective permission keys (union across all assigned roles' permissions) and cache the result on the request scope.

#### Scenario: Permission set reflects current role assignments
- **GIVEN** a user assigned the `puzzle_editor` role
- **WHEN** the user calls any authenticated endpoint
- **THEN** `req.user.permissionKeys` contains every key seeded for `puzzle_editor`

#### Scenario: Role-update propagates immediately
- **GIVEN** a user is assigned `puzzle_reviewer` and the admin removes `puzzle-version:publish` from that role
- **WHEN** the user calls a `@RequirePermission('puzzle-version:publish')` endpoint
- **THEN** the API returns HTTP 403 without requiring the user to re-login

### Requirement: Admin can list roles and permissions

The system SHALL expose `GET /api/admin/roles` and `GET /api/admin/permissions` returning the full catalog with role→permission mappings.

#### Scenario: List roles
- **WHEN** a user with `role:read` GETs `/api/admin/roles`
- **THEN** the API returns an array of `{ id, key, name, description, isSystem, permissionKeys[] }`

#### Scenario: List permissions
- **WHEN** a user with `role:read` GETs `/api/admin/permissions`
- **THEN** the API returns an array of `{ id, key, resource, action, description }`

### Requirement: Admin can assign and revoke roles

The system SHALL expose `POST /api/admin/users/:id/roles` (assign) and `DELETE /api/admin/users/:id/roles/:roleKey` (revoke). Assigning the `super_admin` role SHALL additionally require the `role:assign-super-admin` permission; assigning any other role requires only `role:assign`.

#### Scenario: Assign non-super-admin role
- **WHEN** a user with `role:assign` POSTs `/api/admin/users/:id/roles` with `{ roleKey: 'puzzle_editor' }`
- **THEN** a `UserRole` row is created with `assignedByUserId` set to the acting user

#### Scenario: Assign super_admin role requires elevated permission
- **WHEN** a user with `role:assign` but NOT `role:assign-super-admin` POSTs `/api/admin/users/:id/roles` with `{ roleKey: 'super_admin' }`
- **THEN** the API returns HTTP 403

#### Scenario: Revoke role
- **WHEN** a user with `role:assign` DELETEs `/api/admin/users/:id/roles/puzzle_editor`
- **THEN** the matching `UserRole` row is removed

### Requirement: System roles cannot be deleted

The system SHALL reject deletion of any `Role` row with `isSystem=true`. Editing the permission set of a system role SHALL require the `role:assign-super-admin` permission.

#### Scenario: Delete system role rejected
- **WHEN** any user DELETEs `/api/admin/roles/<super_admin id>`
- **THEN** the API returns HTTP 409 with body `{ error: 'role-is-system' }`

### Requirement: Role permission set is editable

The system SHALL allow rewriting a role's permission set via `PATCH /api/admin/roles/:id` with `{ permissionKeys: string[] }`. The endpoint SHALL transactionally remove obsolete `RolePermission` rows and create missing ones.

#### Scenario: Update permission set
- **WHEN** a user with `role:assign-super-admin` PATCHes `/api/admin/roles/<puzzle_editor id>` with `{ permissionKeys: ['puzzle:read', 'puzzle:create'] }`
- **THEN** every other `RolePermission` row for that role is deleted
- **AND** `RolePermission` rows exist for `puzzle:read` and `puzzle:create`

### Requirement: Startup permission drift check

On `PermissionService.onModuleInit()` the system SHALL scan the codebase for all `@RequirePermission` and `@RequireAnyPermission` decorator arguments and log a warning for any key not present in the `Permission` table. The warning MUST NOT block startup.

#### Scenario: Missing permission key logged
- **GIVEN** an endpoint declares `@RequirePermission('puzzle:unsealing')`
- **AND** the `Permission` table has no row with key `puzzle:unsealing`
- **WHEN** the API process starts
- **THEN** a `WARN` log line is emitted containing the missing key
- **AND** the process does NOT exit
