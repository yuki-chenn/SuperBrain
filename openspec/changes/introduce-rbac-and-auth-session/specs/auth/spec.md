# auth Capability (delta for change `introduce-rbac-and-auth-session`)

## ADDED Requirements

### Requirement: Register account

The system SHALL allow a new user to register with email, username, and password. Email and username MUST be unique. Password MUST be hashed with argon2id before persistence and SHALL never be returned to the client.

#### Scenario: Successful registration
- **WHEN** a client POSTs `/api/auth/register` with `{ email, username, password }` matching the shared `RegisterSchema`
- **THEN** the API creates a `User` row with `status='ACTIVE'`
- **AND** returns `{ user: {...permissionKeys: []}, accessToken }` and sets a refresh-token cookie

#### Scenario: Duplicate email rejected
- **WHEN** the email already exists
- **THEN** the API returns HTTP 409 with body `{ error: 'email-taken' }`

### Requirement: Login with email or username

The system SHALL accept either email or username as the login identifier and validate the password with argon2.

#### Scenario: Successful login
- **WHEN** a client POSTs `/api/auth/login` with `{ emailOrUsername, password }`
- **AND** the password matches the stored hash
- **THEN** the API creates an `AuthSession` (status=ACTIVE, new familyId), returns `{ user, accessToken }`, and sets the refresh-token cookie
- **AND** `user.permissionKeys` contains the union of permissions across the user's assigned roles

#### Scenario: Wrong password
- **WHEN** the password does not match
- **THEN** the API returns HTTP 401 with body `{ error: 'invalid-credentials' }`

#### Scenario: Banned user cannot login
- **WHEN** the user's `status='BANNED'`
- **THEN** the API returns HTTP 403 with body `{ error: 'account-banned' }`

### Requirement: Refresh token rotation

On each successful refresh the system SHALL mark the presented session `ROTATED`, set `replacedBySessionId` to the new session id, and create a new `AuthSession` in the same family with a new token hash.

#### Scenario: Successful refresh
- **WHEN** a client POSTs `/api/auth/refresh` with a valid refresh-token cookie
- **THEN** the API returns `{ accessToken }`, sets a new refresh-token cookie
- **AND** the old `AuthSession.status` becomes `ROTATED`
- **AND** a new `AuthSession.status='ACTIVE'` is created with the same `refreshTokenFamilyId`

### Requirement: Refresh-token reuse compromises the family

If a refresh token is presented that belongs to a `ROTATED`, `REVOKED`, or `COMPROMISED` session AND falls outside the 30-second grace window, the system SHALL mark every `AuthSession` in the same family `COMPROMISED` and reject the request.

#### Scenario: Reuse outside grace window
- **GIVEN** an `AuthSession` was rotated 5 minutes ago
- **WHEN** the same old refresh token is presented again
- **THEN** the API returns HTTP 401 with body `{ error: 'family-compromised' }`
- **AND** every session in that `refreshTokenFamilyId` has `status='COMPROMISED'`

#### Scenario: Reuse inside grace window returns existing rotation
- **GIVEN** an `AuthSession` was rotated 5 seconds ago
- **WHEN** the same old refresh token is presented again
- **THEN** the API returns the previously-rotated new pair without escalating
- **AND** no `AuthSession` in the family is marked `COMPROMISED`

### Requirement: Logout

The system SHALL revoke the current `AuthSession` (status=REVOKED, revokedReason='user-logout') and clear the refresh-token cookie.

#### Scenario: Logout success
- **WHEN** a client POSTs `/api/auth/logout` with a valid refresh-token cookie
- **THEN** the corresponding `AuthSession.status` becomes `REVOKED`
- **AND** the response clears the refresh-token cookie

### Requirement: GET current user

The system SHALL expose `/api/auth/me` returning the authenticated user plus their current `permissionKeys`.

#### Scenario: Authenticated user
- **WHEN** a client GETs `/api/auth/me` with a valid access token
- **THEN** the API returns the `UserSchema` shape including `permissionKeys`

#### Scenario: Unauthenticated
- **WHEN** no access token is provided
- **THEN** the API returns HTTP 401 with `WWW-Authenticate: Bearer realm="api"` header

### Requirement: Login rate limit

The system SHALL throttle `POST /api/auth/login` to at most 5 attempts per minute per source IP.

#### Scenario: Excess attempts blocked
- **WHEN** the same source IP performs 6 logins within 60 seconds
- **THEN** the 6th request returns HTTP 429
