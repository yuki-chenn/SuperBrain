# challenge-runtime Capability (delta for change `introduce-challenge-runtime-gateway`)

## ADDED Requirements

### Requirement: New route shape under /games/$gameSlug

The SPA SHALL expose four challenge-related routes per game:
- `/games/$gameSlug/start`
- `/games/$gameSlug/attempts/$attemptId/play`
- `/games/$gameSlug/attempts/$attemptId/result`
- `/games/$gameSlug/attempts/$attemptId/expired`

#### Scenario: Start route renders without an attempt
- **WHEN** a logged-in user navigates to `/games/sliding-puzzle/start`
- **THEN** the page renders difficulty selector + mode selector and does NOT create an attempt until the user clicks "Begin"

#### Scenario: Play route requires attemptId
- **WHEN** the URL is `/games/sliding-puzzle/attempts/<attemptId>/play`
- **THEN** the route loader fetches `/api/challenges/:id/status` and proceeds only for non-terminal statuses

### Requirement: Legacy /play URLs redirect to /start

The routes `/games/$gameSlug/play` and the legacy game-specific variants (`/games/life-game/practice`, `/games/absolute-command/puzzles/$slug/play`, etc.) SHALL redirect to `/games/$gameSlug/start` whenever the URL lacks an `attemptId` query param.

#### Scenario: Bookmarked old /play redirects
- **WHEN** a user navigates to `/games/sliding-puzzle/play` directly
- **THEN** the router replaces the URL with `/games/sliding-puzzle/start`

### Requirement: ChallengeRouteGuard enforces server-authoritative status

Every challenge route SHALL run a `beforeLoad` guard that GETs `/api/challenges/:id/status` and applies the following redirect matrix:

| URL          | Server status     | Action                       |
|--------------|-------------------|------------------------------|
| `/play`      | terminal success  | redirect → `/result`         |
| `/play`      | terminal failure  | redirect → `/expired`        |
| `/result`    | non-terminal      | redirect → `/play`           |
| `/expired`   | terminal success  | redirect → `/result`         |
| `/expired`   | non-terminal      | redirect → `/play`           |

#### Scenario: Completed attempt rerouted from /play to /result
- **GIVEN** the attempt is `COMPLETED`
- **WHEN** the user navigates to `/games/<slug>/attempts/<id>/play`
- **THEN** the router redirects to `/games/<slug>/attempts/<id>/result`

#### Scenario: Active attempt accessed via /result is rerouted
- **GIVEN** the attempt is `PLAYING`
- **WHEN** the user navigates to `/games/<slug>/attempts/<id>/result`
- **THEN** the router redirects back to `/games/<slug>/attempts/<id>/play`

### Requirement: Entry token is consumed once and never persisted in RANKED/DAILY

For RANKED/DAILY modes the `entryToken` returned by `/start` SHALL be held only in JavaScript memory inside `ChallengeRuntimeStore`. The token SHALL be passed to `/claim` exactly once and discarded. The SPA SHALL NOT persist the token to localStorage, sessionStorage, cookies, or URL on RANKED/DAILY.

#### Scenario: RANKED refresh loses recovery
- **GIVEN** a RANKED attempt is at `PLAYING`
- **WHEN** the user refreshes the `/play` page
- **THEN** the entry token is lost from memory
- **AND** the route guard redirects to `/expired` (reason: `no-entry-token`)

### Requirement: PRACTICE mode may restore entryToken from sessionStorage

For PRACTICE mode the SPA MAY persist `{ attemptId, entryToken, playSessionId }` under sessionStorage key `practice:<gameSlug>`. On `/play` mount with missing in-memory token AND `mode === PRACTICE`, the SPA SHALL restore from sessionStorage and retry `/claim`.

#### Scenario: PRACTICE refresh resumes play
- **GIVEN** a PRACTICE attempt at `PLAYING` with `{attemptId, entryToken, playSessionId}` in sessionStorage
- **WHEN** the user refreshes `/play`
- **THEN** the SPA restores credentials from sessionStorage, calls `/claim`, and resumes play

### Requirement: Heartbeat runs at policy-defined interval and aborts on accepted=false

The `useChallengeHeartbeat(attemptId, intervalSec)` hook SHALL POST `/heartbeat` every `intervalSec` seconds while the attempt is `PLAYING`. On a response with `accepted=false` the hook SHALL trigger navigation to `/expired` with the returned reason.

#### Scenario: Heartbeat continues until terminal
- **GIVEN** policy `heartbeatIntervalSec=5`
- **WHEN** the SPA renders `/play`
- **THEN** heartbeat POSTs occur every 5±0.5 seconds for the duration of `PLAYING`

#### Scenario: Heartbeat 'accepted=false' triggers expired navigation
- **WHEN** a heartbeat response has `accepted=false, status='TIMEOUT'`
- **THEN** the SPA navigates to `/expired` with `?reason=timeout`

### Requirement: BroadcastChannel detects second-tab conflicts

The `ChallengeBroadcast` module SHALL open a `BroadcastChannel('challenge:' + attemptId)` and emit `{ type: 'claim', playSessionId }` on `/play` mount. On receiving a `claim` event with a different `playSessionId`, the local tab SHALL POST `/abandon { reason: 'tab-conflict' }` and navigate to `/expired`.

#### Scenario: Second tab forces loser to expired
- **GIVEN** the original tab holds an active attempt at `PLAYING`
- **WHEN** the user opens the same `/play` URL in a second tab
- **THEN** the original (loser) tab navigates to `/expired` with reason `tab-conflict`
- **AND** the new tab's `/claim` request fails (server-side `uq_attempt_active_runtime_session`)

### Requirement: Navigate-away blocker on PLAYING

While the attempt is `PLAYING` the SPA SHALL block navigation away from `/play` with a confirmation dialog (`LeaveChallengeDialog`). Confirming abandons the attempt; cancelling stays. On browser tab close the SPA SHALL `sendBeacon` `/abandon { reason: 'browser-close' }` (fire-and-forget).

#### Scenario: User confirms leave
- **GIVEN** the user clicks a navigation link while at `/play` with attempt `PLAYING`
- **WHEN** the user confirms in `LeaveChallengeDialog`
- **THEN** the SPA POSTs `/abandon { reason: 'user-click' }` and proceeds with navigation

#### Scenario: User cancels leave
- **WHEN** the user cancels the dialog
- **THEN** the SPA remains at `/play` with the attempt still `PLAYING`

#### Scenario: Browser tab close fires sendBeacon
- **WHEN** the user closes the browser tab
- **THEN** `navigator.sendBeacon('/api/challenges/:id/abandon', JSON.stringify({reason:'browser-close', playSessionId}))` is invoked

### Requirement: ChallengeRuntimeStore tracks local UI state only

The Zustand store SHALL hold only client-side ephemeral state: `phase`, `attemptStatus`, `remainingMs`, `conflictDetected`, `lastServerSync`. The store SHALL NOT be used as a source of truth for whether the attempt is allowed to continue — that determination is always made by `/status` or the response of the most recent challenge endpoint.

#### Scenario: Store state lost on refresh (RANKED)
- **GIVEN** a RANKED attempt is at `PLAYING`
- **WHEN** the page is refreshed
- **THEN** the Zustand store is reinitialised to defaults; recovery proceeds only via the route guard's `/status` query
