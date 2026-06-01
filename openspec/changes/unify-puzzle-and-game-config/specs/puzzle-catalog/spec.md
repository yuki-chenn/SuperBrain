# puzzle-catalog Capability (delta for change `unify-puzzle-and-game-config`)

## ADDED Requirements

### Requirement: Generic puzzle CRUD endpoints

The system SHALL expose admin endpoints for managing puzzles regardless of game:
- `GET    /api/admin/puzzles?gameId=&status=&tag=` — paginated list
- `GET    /api/admin/puzzles/:id` — single puzzle + version history
- `POST   /api/admin/puzzles` — create new (DRAFT)
- `PATCH  /api/admin/puzzles/:id` — update metadata (title, description, difficulty pin, sortOrder)
- `DELETE /api/admin/puzzles/:id` — soft delete (status='ARCHIVED', archivedAt=now)

All endpoints SHALL require `puzzle:read` (GET) or `puzzle:create` / `puzzle:update` / `puzzle:delete` accordingly.

#### Scenario: List filtered by game and status
- **WHEN** an editor GETs `/api/admin/puzzles?gameId=<id>&status=PUBLISHED`
- **THEN** the response includes only puzzles for that game with status PUBLISHED, paginated default 20

#### Scenario: Create puzzle requires puzzle:create
- **WHEN** a user without `puzzle:create` POSTs `/api/admin/puzzles`
- **THEN** the API returns HTTP 403

### Requirement: Puzzle version lifecycle endpoints

The system SHALL expose endpoints under `/api/admin/puzzles/:puzzleId/versions`:
- `GET    .../versions` — list with status and validation report summary
- `POST   .../versions` — create new DRAFT version with `{ engineKey, content }` body
- `GET    .../versions/:vid` — version detail
- `PATCH  .../versions/:vid` — update content (only while DRAFT or VALIDATING)
- `POST   .../versions/:vid/validate` — run engine validator, persist `validationStatus` + `validationReport`
- `POST   .../versions/:vid/publish` — transition VALID → PUBLISHED (and demote prior PUBLISHED → ARCHIVED in same txn)
- `POST   .../versions/:vid/archive` — manual archive

#### Scenario: Create version snapshots content + hash
- **WHEN** an editor POSTs a new version with `{ engineKey: 'life-game', content: {...} }`
- **THEN** the API computes `contentHash = sha256(JSON.stringify(content))`
- **AND** persists the new `PuzzleVersion` row with `version = max(prev)+1`, `status='DRAFT'`, `validationStatus='UNVALIDATED'`

#### Scenario: Validate sets VALID/INVALID with report
- **WHEN** an editor POSTs `.../versions/:vid/validate` on a DRAFT version
- **THEN** the API loads the engine validator for `engineKey` and runs it on `content`
- **AND** sets `validationStatus = VALID` (or INVALID/WARNING) and `validationReport = { errors: [...], warnings: [...] }`

#### Scenario: Publish atomically demotes prior PUBLISHED
- **GIVEN** Puzzle P has version A with `status=PUBLISHED` and version B with `status=VALID`
- **WHEN** an editor POSTs `.../versions/B/publish`
- **THEN** in a single transaction: A becomes `ARCHIVED`, B becomes `PUBLISHED`, `Puzzle.currentVersionId = B.id`
- **AND** the partial index `uq_published_puzzle_version` holds (only B is PUBLISHED)

#### Scenario: Publish without VALID validation rejected
- **WHEN** an editor POSTs publish on a version whose `validationStatus != 'VALID'`
- **THEN** the API returns HTTP 409 with body `{ error: 'must-validate-first' }`

### Requirement: Engine content validators are shared

The system SHALL expose `validateContent(content)` from `@brain-games/game-engine` per engineKey. Both the admin SPA (preflight) and the API `validate` endpoint MUST call the same function. The function SHALL return `{ valid: boolean; errors?: string[]; warnings?: string[] }`.

#### Scenario: SPA preflight matches API verdict
- **GIVEN** a draft Life puzzle with a board that fails B3/S23 stability requirement
- **WHEN** the admin SPA preflights via the engine's `validateContent`
- **AND** the API `validate` endpoint also runs `validateContent`
- **THEN** both return the same `{ valid: false, errors: [...] }` shape

### Requirement: Puzzle schedules endpoints

The system SHALL expose:
- `GET    /api/admin/puzzle-schedules?gameId=&mode=DAILY&from=&to=`
- `POST   /api/admin/puzzle-schedules` with `{ gameId, puzzleId, puzzleVersionId, difficultyId?, mode, granularity, startAt, endAt, timezone }`
- `PATCH  /api/admin/puzzle-schedules/:id`
- `DELETE /api/admin/puzzle-schedules/:id`

Scheduling overlaps for the same `(gameId, difficultyId, mode, granularity)` window MUST be rejected at the application layer.

#### Scenario: Overlapping schedule rejected
- **GIVEN** an existing schedule for `(life-game, normal, DAILY, 2026-06-01)`
- **WHEN** an editor POSTs another schedule that overlaps the same date window for the same `(gameId, difficultyId, mode)`
- **THEN** the API returns HTTP 409 with body `{ error: 'schedule-overlap' }`

### Requirement: Puzzle tag management

The system SHALL expose `/api/admin/puzzle-tags` for CRUD on `PuzzleTag`. Bindings (`PuzzleTagBinding`) are managed via `POST /api/admin/puzzles/:id/tags { tagIds: string[] }` (replaces the binding set transactionally).

#### Scenario: Replace tag bindings
- **GIVEN** a puzzle with bindings to tags T1, T2
- **WHEN** an editor POSTs `{ tagIds: [T2, T3] }` to that puzzle's `/tags`
- **THEN** the binding to T1 is removed, the binding to T3 is created, T2 unchanged

### Requirement: Puzzle asset upload (local-disk in this change)

The system SHALL expose `POST /api/admin/puzzles/:id/assets` (multipart/form-data) which:
- Hashes the file via sha256.
- Stores under `apps/api/uploads/<sha256>` if not already present.
- Persists a `PuzzleAsset` row with `sha256, url='/uploads/<sha256>', mimeType, sizeBytes`.
- Reuses existing row if same sha256 (idempotent).

#### Scenario: Same-content upload deduplicates
- **WHEN** an editor uploads the same image file twice
- **THEN** only one file exists on disk; two `PuzzleAsset` rows MAY exist if `assetKey` differs, but `sha256` is shared

## MODIFIED Requirements

(none — this is a new capability)
