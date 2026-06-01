# games-catalog Capability (delta for change `introduce-challenge-runtime-gateway`)

## MODIFIED Requirements

### Requirement: Game catalog exposes mode + difficulty configuration

The system SHALL expose `GET /api/games` returning the list of PUBLISHED games. For each game the response SHALL include the ACTIVE `GameDifficulty` rows (key, label, sortOrder, maxDurationMs) and the supported `ChallengeMode` values derived from ACTIVE `GameChallengePolicy` rows. The legacy `difficultyLevels` JSON column on `Game` is no longer the source of truth.

#### Scenario: GET /api/games returns versioned difficulty list
- **WHEN** any authenticated user GETs `/api/games`
- **THEN** the response is `[{ id, slug, title, ..., difficulties: [{ key, label, sortOrder, maxDurationMs }], supportedModes: ['RANKED', 'PRACTICE'] }, ...]`
- **AND** every `difficulties[]` entry corresponds to a `GameDifficulty` row with `status='ACTIVE'`

#### Scenario: GET /api/games/:slug returns single game with active config
- **WHEN** the SPA GETs `/api/games/sliding-puzzle`
- **THEN** the response includes the difficulties and supported modes for THAT game only
- **AND** includes a `contentMode` field (GENERATED/CURATED/SCHEDULED/MIXED) reflecting the ACTIVE `GameContentPolicy`

## REMOVED Requirements

### Requirement: Game start shortcut on /api/games
**Reason**: Replaced by `POST /api/challenges/start` in the `challenges` capability. The catalog endpoint no longer creates attempts.
**Migration**: SPA should call `POST /api/challenges/start` with `{ gameSlug, mode, difficultyKey }` to begin a challenge; the `/api/games` endpoints become read-only catalog queries.
