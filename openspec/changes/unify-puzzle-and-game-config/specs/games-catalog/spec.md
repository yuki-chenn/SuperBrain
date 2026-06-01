# games-catalog Capability (delta for change `unify-puzzle-and-game-config`)

## ADDED Requirements

### Requirement: Game CRUD endpoints

The system SHALL expose admin endpoints to manage Game catalog entries:
- `GET    /api/admin/games` — list with version counts
- `GET    /api/admin/games/:id` — detail with active rule-set / difficulties / policies
- `POST   /api/admin/games` — create (DRAFT)
- `PATCH  /api/admin/games/:id` — update metadata
- `POST   /api/admin/games/:id/publish` — set status=PUBLISHED, publishedAt=now
- `POST   /api/admin/games/:id/archive` — set status=ARCHIVED, archivedAt=now

#### Scenario: Publish requires game:publish
- **WHEN** a user without `game:publish` POSTs `/api/admin/games/:id/publish`
- **THEN** the API returns HTTP 403

### Requirement: GameRuleSetVersion lifecycle endpoints

The system SHALL expose:
- `GET    /api/admin/games/:gameId/rule-sets`
- `POST   /api/admin/games/:gameId/rule-sets` — create new DRAFT with `{ name, engineKey, engineVersion?, config }`; computes `configHash`; sets `version = max(prev)+1`
- `POST   /api/admin/games/:gameId/rule-sets/:rsvId/activate` — transition DRAFT/INACTIVE → ACTIVE, demoting prior ACTIVE → INACTIVE in same txn

#### Scenario: Activate atomically demotes prior ACTIVE
- **GIVEN** rule-set version V1 is ACTIVE and V2 is DRAFT
- **WHEN** an editor POSTs `/api/admin/games/:gameId/rule-sets/V2/activate`
- **THEN** in a single transaction V1 becomes INACTIVE, V2 becomes ACTIVE
- **AND** `uq_active_game_ruleset_version` holds

### Requirement: GameDifficulty lifecycle endpoints

The system SHALL expose `/api/admin/games/:gameId/difficulties` and `/api/admin/games/:gameId/difficulties/:diffId/activate` analogous to rule-set. The `key` is required; new edits MUST create a new row with `version = max(prev for same key)+1` rather than mutating the row.

#### Scenario: Edit creates new version
- **GIVEN** difficulty `(life-game, key='easy', version=1, status=ACTIVE)`
- **WHEN** an editor POSTs `/api/admin/games/:gameId/difficulties` with `{ key: 'easy', label: 'Easy', config: {...modified...} }`
- **THEN** a new row is created with `version=2, status='DRAFT'`
- **AND** version 1 is unchanged

#### Scenario: Activate v2 demotes v1
- **WHEN** the editor activates v2
- **THEN** v1 becomes INACTIVE, v2 becomes ACTIVE; `uq_active_game_difficulty` holds for `(gameId, key='easy')`

### Requirement: GameContentPolicy + GameChallengePolicy lifecycle endpoints

The system SHALL expose CRUD + activate endpoints for both `GameContentPolicy` and `GameChallengePolicy`. Activating a policy of scope `(gameId, mode, difficultyId)` (any may be NULL) atomically demotes the prior ACTIVE of the same scope.

#### Scenario: Activate ChallengePolicy for a specific (mode, difficulty)
- **GIVEN** an ACTIVE policy for `(life-game, mode=RANKED, difficultyId=NULL)`
- **WHEN** the editor activates a new policy with the same `(gameId, mode, difficultyId)`
- **THEN** the prior is INACTIVE, the new is ACTIVE; `uq_active_game_challenge_policy` (NULLS NOT DISTINCT) holds

## REMOVED Requirements

### Requirement: difficultyLevels JSON on Game
**Reason**: The legacy `Game.difficultyLevels: Json[]` shape (set via admin-games-service) is replaced by the versioned `GameDifficulty` table managed by the new endpoints.
**Migration**: Admin SPA reads ACTIVE `GameDifficulty` rows instead of `Game.difficultyLevels`. The legacy field still exists on `Game` only as metadata reference; admin endpoints SHALL NOT mutate it.

### Requirement: Per-game admin editors (legacy)
**Reason**: Replaced by the generic Puzzle/PuzzleVersion editor (`puzzle-catalog` capability) plus per-engine content editor components.
**Migration**: Delete `apps/admin/src/app/routes/ac-puzzle-edit.tsx`, `ac-puzzle-list.tsx`, `ac-maze-editor.tsx` and any legacy Life/PCB-specific editor routes; route operators to `/puzzles` and `/puzzles/:id/versions/:vid/edit`.
