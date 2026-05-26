# auth Specification

## Purpose

Identity capability for SuperBrain platform. Provides email/username + password registration, login, JWT-based access control, and refresh-token-rotation sessions with reuse detection. All authenticated routes downstream rely on this capability for `userId`/`role` injection via the `JwtAuthGuard` + `CurrentUser` decorator.

## Architecture Notes

- Password storage: argon2id via `argon2` package.
- Access token: short-lived JWT signed by `TokenService` (`JWT_ACCESS_SECRET`), payload `{ userId, username, role, sessionId }`.
- Refresh token: random opaque string, hashed and stored on `Session` row; transported as `refresh_token` HttpOnly cookie set by `CookieService`.
- Session rotation: every successful refresh creates a new `Session` in the same `refreshTokenFamilyId` and revokes the previous with `revokedReason = 'ROTATED'`.
- Reuse detection: presenting an already-rotated refresh token outside a 10s grace window triggers full family revocation (`REUSE_DETECTED`).
- Refresh TTL: configurable via `JWT_REFRESH_TTL_DAYS`, default 30 days.

## Requirements

### Requirement: Self-service registration

The system SHALL allow new users to register with email, username, and password, provisioning a session immediately so the client receives an access token plus refresh cookie without a separate login step.

#### Scenario: Successful registration
- **WHEN** `POST /auth/register` is called with a unique email, unique username, and password matching `RegisterSchema`
- **THEN** a `User` is created with `passwordHash` produced by argon2id, status `ACTIVE`, role `USER`
- **AND** a `Session` is created with a fresh `refreshTokenFamilyId`
- **AND** the response body contains `{ user, accessToken }` (sanitized user without `passwordHash`)
- **AND** the `refresh_token` HttpOnly cookie is set to the raw refresh token

#### Scenario: Email collision
- **WHEN** registration is attempted with an email already used
- **THEN** the request fails with `409 Conflict` and message `"Email already registered"`
- **AND** no user or session is created

#### Scenario: Username collision
- **WHEN** registration is attempted with a username already used
- **THEN** the request fails with `409 Conflict` and message `"Username already taken"`

### Requirement: Credential login

The system SHALL authenticate users by email-or-username plus password and issue an access token together with a fresh refresh-token session.

#### Scenario: Successful login by email
- **WHEN** `POST /auth/login` is called with `emailOrUsername` matching a user's email and the correct password
- **THEN** argon2 verification succeeds
- **AND** `User.lastLoginAt` is updated to now
- **AND** a new `Session` (new family) is created and the response contains `{ user, accessToken }` plus `refresh_token` cookie

#### Scenario: Successful login by username
- **WHEN** `POST /auth/login` is called with `emailOrUsername` matching a user's username and the correct password
- **THEN** the same successful flow runs

#### Scenario: Wrong credentials
- **WHEN** the password fails argon2 verification, or no matching user exists
- **THEN** the request fails with `401 Unauthorized` and message `"Invalid credentials"`
- **AND** no session is created and `lastLoginAt` is not updated

#### Scenario: Banned user
- **WHEN** a user's `status` is not `ACTIVE`
- **THEN** the request fails with `403 Forbidden` and message `"User is not active"`

### Requirement: Access token authentication

The system SHALL accept the access token via `Authorization: Bearer <token>` and inject the resolved user (`{ id, username, role, ... }`) on protected routes.

#### Scenario: Valid access token
- **WHEN** a request to a route protected by `JwtAuthGuard` carries a valid, unexpired access token
- **THEN** the request proceeds and `@CurrentUser()` resolves to the embedded payload

#### Scenario: Missing or invalid access token
- **WHEN** a protected route is accessed without a token, with an expired token, or with a tampered token
- **THEN** the request fails with `401 Unauthorized`

### Requirement: Refresh-token rotation with reuse detection

The system SHALL rotate refresh tokens on every refresh, invalidate the previous token, and detect reuse outside a brief grace window by revoking the entire token family.

#### Scenario: Normal refresh
- **WHEN** `POST /auth/refresh` is called with a valid, unrevoked refresh cookie
- **THEN** the matching `Session` is marked `revokedAt = now`, `revokedReason = 'ROTATED'`, `replacedBySessionId = newSession.id`
- **AND** a new `Session` is created in the same `refreshTokenFamilyId` with a new hash and `expiresAt = now + JWT_REFRESH_TTL_DAYS`
- **AND** the response includes a new access token and the cookie is overwritten with the new refresh token

#### Scenario: Refresh with rotated token within grace window
- **WHEN** the same refresh token is replayed within 10 seconds of being rotated (e.g., parallel client retry)
- **THEN** the request fails with `401 Unauthorized` (`AUTH_REFRESH_TOKEN_INVALID`) but the family is NOT revoked

#### Scenario: Refresh-token reuse outside grace window
- **WHEN** a refresh token whose `revokedReason = 'ROTATED'` is presented more than 10 seconds after rotation
- **THEN** every active session sharing the same `refreshTokenFamilyId` is revoked with reason `REUSE_DETECTED`
- **AND** the request fails with `401 Unauthorized`

#### Scenario: Refresh on banned user
- **WHEN** the matching session belongs to a user whose status is no longer `ACTIVE`
- **THEN** the session is revoked with reason `USER_BANNED` and the request fails with `401 Unauthorized`

#### Scenario: Expired refresh token
- **WHEN** the `Session.expiresAt` is in the past
- **THEN** the session is revoked with reason `EXPIRED` and the request fails with `401 Unauthorized`

#### Scenario: Missing refresh cookie
- **WHEN** `POST /auth/refresh` is called without a `refresh_token` cookie
- **THEN** the request fails with `401 Unauthorized` and message `AUTH_REFRESH_TOKEN_MISSING`

### Requirement: Logout (single device and all devices)

The system SHALL allow a user to revoke the current session or all of the user's sessions and clear the refresh cookie.

#### Scenario: Single-session logout
- **WHEN** `POST /auth/logout` is called with a valid refresh cookie
- **THEN** the matching session is revoked with reason `LOGOUT` and the cookie is cleared
- **AND** future calls to `/auth/refresh` with that token fail (and trigger reuse detection if outside grace window)

#### Scenario: Logout-all
- **WHEN** an authenticated user calls `POST /auth/logout-all`
- **THEN** every unrevoked `Session` for that `userId` is revoked with reason `LOGOUT_ALL`
- **AND** the refresh cookie is cleared

### Requirement: Current user inspection

The system SHALL expose `GET /auth/me` returning the sanitized current user.

#### Scenario: Authenticated me
- **WHEN** an authenticated request is made to `GET /auth/me`
- **THEN** the response body is `{ id, email, username, role, avatarUrl }` (no password hash, no internal fields)

#### Scenario: Unauthenticated me
- **WHEN** the request lacks a valid access token
- **THEN** the response is `401 Unauthorized`

### Requirement: Session metadata persistence

The system SHALL record `userAgent` and `ipAddress` on every newly created session for audit purposes.

#### Scenario: New session captures request context
- **WHEN** a session is created via register, login, or rotation
- **THEN** the row stores the request's `User-Agent` header and `req.ip` in `userAgent` and `ipAddress`
