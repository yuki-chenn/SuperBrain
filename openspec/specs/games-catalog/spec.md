# games-catalog Specification

## Purpose

Catalog capability for SuperBrain. Stores stable game metadata (title, description, cover, source, status, difficulty levels) keyed by `slug`, and exposes read-only listing/lookup endpoints used by the web client to render the games list and game-detail pages. Each game's runtime behavior is delegated to a `GameAdapter` registered against the slug.

## Architecture Notes

- Storage: `Game` Prisma model. `slug` is the stable unique key (`sliding-puzzle`, `life-game`, `precise-character-building`).
- `difficultyLevels` is a JSON array of objects with at least `key` and `label`; per-game additional fields (e.g. `size`, `targetRegionCount`, `boardSize`) are allowed.
- `metadata` JSONB carries non-essential annotations (`tags`, `estimatedDuration`, etc.).
- Status lifecycle: `DRAFT | PUBLISHED | ARCHIVED`. Public list returns only `PUBLISHED` by default.
- Adapter registry: `GamesService` holds an in-memory `Map<slug, GameAdapter>` populated from injected adapters (`SlidingPuzzleAdapter`, `LifeGameAdapter`, `PreciseCharacterBuildingAdapter`).

## Requirements

### Requirement: Public game listing

The system SHALL expose a public endpoint listing every published game ordered by creation time ascending.

#### Scenario: Default list returns published games
- **WHEN** `GET /games` is called
- **THEN** the response body is `{ items: Game[] }` where every item has `status = 'PUBLISHED'`
- **AND** items are ordered by `createdAt` ascending
- **AND** each item exposes at least `id`, `slug`, `title`, `subtitle`, `description`, `source`, `coverUrl`, `status`, `difficultyLevels`, `metadata`, `createdAt`, `updatedAt`

### Requirement: Game lookup by slug

The system SHALL allow clients to fetch a single game by its slug.

#### Scenario: Existing slug
- **WHEN** `GET /games/:slug` is called with a slug that exists
- **THEN** the response is the full `Game` row regardless of status

#### Scenario: Unknown slug
- **WHEN** `GET /games/:slug` is called with a slug that does not exist
- **THEN** the response is `404 Not Found` with message `Game '<slug>' not found`

### Requirement: Stable slugs

The system SHALL treat `Game.slug` as the canonical identifier used by routes, leaderboards, adapters, and the frontend registry.

#### Scenario: Slug is unique
- **WHEN** persisting a `Game`
- **THEN** the database enforces `slug` uniqueness (`@unique`)

#### Scenario: Slug used end-to-end
- **WHEN** a request is routed through `GET /games/:slug`, `POST /games/:slug/attempts/start`, or `GET /games/:slug/leaderboards`
- **THEN** the same `slug` value is the join key used by the API, the Prisma row, and the frontend `webGameRegistry`

### Requirement: Difficulty level definitions are game-specific JSON

The system SHALL store each game's difficulty levels as a JSON array on the `Game` row, with `key` and `label` mandatory and other fields game-specific.

#### Scenario: Sliding puzzle difficulties
- **WHEN** the `sliding-puzzle` row is read
- **THEN** `difficultyLevels` includes `easy/normal/hard` entries with `key`, `label`, `size`, and `scrambleMoves`

#### Scenario: Life game difficulties
- **WHEN** the `life-game` row is read
- **THEN** `difficultyLevels` includes entries with `key`, `label`, `targetRegionCount`, and `description`

#### Scenario: Precise character building difficulties
- **WHEN** the `precise-character-building` row is read
- **THEN** `difficultyLevels` includes entries with `key`, `label`, `boardSize`, `picksPerRound`, `radicalPoolSize`, `adjacencyMode`, `allowedStructures`, `rootComplexity`

### Requirement: Adapter registry

The system SHALL provide a runtime registry that maps each game slug to a `GameAdapter` implementation responsible for `startAttempt` and `finishAttempt`.

#### Scenario: Adapter registered at boot
- **WHEN** `GamesService` is constructed
- **THEN** every injected adapter is registered under its `adapter.slug`
- **AND** `GamesService.getAdapter(slug)` returns the adapter instance

#### Scenario: Missing adapter
- **WHEN** `GamesService.getAdapter(slug)` is called for a slug with no registered adapter
- **THEN** it throws `404 Not Found` with message `No adapter for game '<slug>'`

### Requirement: Seed-managed game set

The system SHALL provision the canonical game catalog (`sliding-puzzle`, `life-game`, `precise-character-building`) plus their leaderboard definitions and seed puzzles via the Prisma seed script.

#### Scenario: Idempotent seeding
- **WHEN** `pnpm db:seed` is run on a database that already contains these games
- **THEN** rows are upserted (no duplicates) and metadata fields are refreshed to seed values

#### Scenario: Per-game leaderboards seeded
- **WHEN** seeding completes
- **THEN** each game has its `LeaderboardDefinition` rows created via `seedLeaderboards`
