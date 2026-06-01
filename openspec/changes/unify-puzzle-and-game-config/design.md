# Design — unify-puzzle-and-game-config

## Context

Change 1 introduced the versioned configuration tables and unified the puzzle catalog under `Puzzle + PuzzleVersion.content`. Change 3 wired `ChallengesService.start` to read those tables. But the admin SPA is stuck on the legacy shape and cannot edit any of it. New games cannot be added without raw SQL. This change builds the operator-facing CRUD surface.

The hard part is **engine-aware content editing**. Each curated game has a non-trivial puzzle shape; the legacy admin had bespoke editor pages per game. We preserve that user experience but route saves through a generic backend.

## Goals / Non-Goals

**Goals**
- Operators can manage games, rule-set versions, difficulties, content/challenge policies, puzzles, puzzle versions, schedules, tags, assets via admin SPA.
- Each engine has a dedicated content editor component but a generic Puzzle/PuzzleVersion endpoint pair.
- Engine content validators run on save (admin SPA preflight + API validate step) and report `{ valid, errors[] }`.
- Activation of versioned config (rule-set, difficulty, policies) atomically swaps `status` from ACTIVE-prev to INACTIVE and the new one DRAFT/VALID to ACTIVE; partial-unique-index enforces.
- Publishing a `PuzzleVersion` transitionally promotes prior `PUBLISHED` to `ARCHIVED` and the new one to `PUBLISHED`; partial-unique-index `uq_published_puzzle_version` enforces single publish per puzzle.
- New games can be onboarded purely from admin UI (assuming the engine + content-schema package is already shipped).

**Non-Goals**
- No object-storage backend for `PuzzleAsset` (local-disk only; cloud storage deferred).
- No collaborative editing / locking on `PuzzleVersion` drafts.
- No engine-side runtime changes — those landed in Change 3. This change only edits the catalog.
- No bulk import/export tools (deferred).
- No leaderboard config editor (Change 5 owns that surface).
- No game-engine schema migration helper for changing `PuzzleVersion.schemaVersion` (manual for now).

## Decisions

### D1 — Per-engine content editors but shared CRUD endpoints

Backend exposes generic `POST /api/admin/puzzles` and `POST /api/admin/puzzles/:id/versions` whose body is `{ engineKey, content }`. The frontend chooses the right editor component based on `engineKey`. Adding a new engine = ship a new Zod schema + a new React component, no backend changes.

Alternative: per-engine REST endpoints. Rejected — would explode admin module surface area and defeat the unified Puzzle model.

### D2 — Content validation lives in @brain-games/game-engine

Each `<game>/content-validator.ts` exports `validateContent(content): { valid: boolean; errors?: string[] }`. The admin SPA imports the validator for preflight; the API `admin-puzzle-versions.validate(id)` endpoint imports the same. Single source of truth.

### D3 — Save-flow is a 3-step wizard

```
draft → validating → valid/invalid → published
```

1. Operator saves DRAFT (any state allowed).
2. Operator clicks "Validate" — backend runs engine validator, sets `validationStatus = VALID|INVALID|WARNING`, persists `validationReport`.
3. Operator clicks "Publish" — only allowed if `validationStatus = VALID`. Backend atomically: ARCHIVES the current PUBLISHED version (if any), sets the target version PUBLISHED, updates `Puzzle.currentVersionId`. The partial index `uq_published_puzzle_version` is the safety net.

### D4 — Versioned-config activation is atomic

Activating a `GameRuleSetVersion` / `GameDifficulty` / `GameContentPolicy` / `GameChallengePolicy` runs as a single transaction:
- UPDATE current ACTIVE row(s) SET status = INACTIVE (if any).
- UPDATE target row SET status = ACTIVE, activatedAt = now.
The partial-unique-index is the post-condition safety; the application logic ensures the UPDATEs happen in the right order to avoid temporary index violation (set old → INACTIVE first within the same txn).

### D5 — DifficultyVersion bumping rule

Editing the `config` of a `GameDifficulty` does NOT mutate the row. Operator must create a new row with `version = N+1`, validate, activate. This guarantees in-flight `GameAttempt` rows referencing the old version see the old config forever.

### D6 — Content JSON is parsed via Zod at every boundary

- API write: `admin-puzzles.service.create({engineKey, content})` calls `validateContent(content)` and rejects on invalid before INSERT.
- API read (`ChallengesService.start`): parses `content` via the engine's Zod schema; throws if mismatch (signals corrupt DB).
- Admin SPA read: parses with the same schema; rejects render if mismatch with a useful error.

### D7 — Asset upload is local-disk in this change

`PuzzleAsset` stores `url` (local path under `apps/api/uploads/<sha256>`) + `sha256`. The API serves the file via a static-route middleware. Object storage (S3/MinIO) deferred. The schema already supports both via `storageKey`.

### D8 — Tags are admin-only, shared globally

`PuzzleTag.gameId IS NULL` for global tags; per-game tags live with `gameId` set. The admin UI shows both groups. Tags are upserted by `(gameId, key)`; binding to a puzzle uses `PuzzleTagBinding` composite PK.

### D9 — Per-engine PuzzleContentEditor contract

```tsx
type PuzzleContentEditorProps = {
  game: Game;
  difficulty: GameDifficulty | null;   // if puzzle has difficulty pin
  initialContent: unknown;             // current draft, parsed via the engine schema
  onChange: (content: unknown) => void;
  onValidate?: (result: { valid: boolean; errors?: string[] }) => void;
  readOnly?: boolean;
};
```

`PuzzleVersionEditor` is the generic shell that wraps `<PuzzleContentEditor>` in a layout with action bar (Save Draft / Validate / Publish / Diff vs current PUBLISHED).

### D10 — Difficulty / Policy editors are JSON-form generators

`DifficultyEditor` and `ChallengePolicyEditor` use a generic JSON-form library (we already ship `zod` so we can derive simple form from a Zod schema). Engine-specific difficulty schema lives in `packages/shared/src/games/<game>/difficulty-schema.ts`. Engine-agnostic challenge-policy schema is shared across all games.

### D11 — RBAC keys for catalog admin

Reuse the existing permission keys seeded in Change 2:
- `game:read` to view; `game:update` to edit metadata; `game:publish` to flip PUBLISHED.
- `game-config:read` / `game-config:create` / `game-config:activate` for rule-set / difficulty / policy.
- `puzzle:*`, `puzzle-version:*`, `puzzle-asset:*`, `puzzle-tag:manage` for puzzles.

If we discover a missing key during implementation, add it to `seed/permissions.ts` and run reseed; this is the documented additive path.

### D12 — Difficulty deletion is soft

Deleting a `GameDifficulty` sets `status='ARCHIVED'` and is allowed only if no ACTIVE attempts reference it (verify via `GameAttempt.difficultyId` count). Hard delete deferred; soft delete preserves audit history.

## Risks / Trade-offs

- **[Risk]** Engine-content Zod schemas must stay in lockstep with engine validator + actual puzzle content. → **Mitigation**: type-test in each engine package: `expectTypeOf<ContentSchemaInput>().toEqualTypeOf<ContentValidatorInput>()`.
- **[Risk]** Activating new rule-set version while attempts are in-flight could cause confusion. → **Accepted**: in-flight attempts already snapshot `ruleSetVersionId` (Change 1 / 3); they continue on the old config.
- **[Risk]** Local-disk asset storage will not survive a container rebuild. → **Accepted** for now; dev/staging only. Production will switch to S3/MinIO in a later change.
- **[Risk]** Bulk re-publish workflow missing — operator must publish puzzles one at a time. → **Accepted**; rare workflow.
- **[Trade-off]** Generic JSON-form editor for difficulty/policy may be ugly. → **Accepted**; bespoke per-game policy editors are deferred.

## Migration Plan

1. Re-include `src/admin` (already in after Change 2) and verify which files still reference removed Prisma types.
2. Rewrite `admin-games.service.ts` against the new versioned tables.
3. Add `admin-puzzles.service.ts` + `admin-puzzle-versions.service.ts` + the rest.
4. Add per-engine content schemas in `@brain-games/shared`.
5. Add per-engine content validators in `@brain-games/game-engine`.
6. Rewrite admin SPA features.
7. Manual smoke: create a new Life puzzle via UI, validate, publish; play it via web SPA in Change 3's flow.

**Rollback**: revert commits; underlying data and Change 1/2/3 unaffected.

**Verification gate**:
- API: list endpoints return seeded rows; create new puzzle returns 201; validate runs the engine; publish atomically swaps PUBLISHED.
- DB: `uq_published_puzzle_version` rejects two publishes; activation of new rule-set demotes the previous one in a single transaction.
- Admin SPA: catalog page shows 4 games + active rule-set/difficulty counts; puzzle list shows 21 published puzzles; opening a Life puzzle renders the LifeGameContentEditor.

## Open Questions

1. Should the admin UI support reverting to a prior PUBLISHED version? **Adopted**: yes — "Re-publish v3" button creates a fresh version copy of v3 → publish, preserving the history rather than mutating v3 in place.
2. Should we expose a per-puzzle "Test Run" button that starts an `ADMIN_TEST` mode attempt? **Adopted**: deferred — but the schema supports it (`ChallengeMode.ADMIN_TEST`); flag for a follow-up.
3. Should `PuzzleAsset.assetKey` be unique per puzzle? **Adopted**: not enforced at schema level; admin UI enforces uniqueness at write time within `(puzzleId, assetKey)`.
