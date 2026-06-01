# precise-character-building Capability (delta for change `retire-game-specific-endpoints`)

## REMOVED Requirements

### Requirement: Round submission endpoint
**Reason**: Replaced by the unified `POST /api/challenges/:id/submissions { type: 'ROUND', payload, ... }`.
**Migration**: SPA calls the unified endpoint; legacy `PreciseCharacterGameModule` HTTP surface deleted. The validator under `@brain-games/game-engine/precise-character-building` is invoked from `PreciseCharacterBuildingAdapter.verifySubmission`.

### Requirement: PCB specific finish / reset
**Reason**: Reset within an attempt is no longer supported via the legacy route; restarting requires abandoning the current attempt and starting a new one through `/api/challenges/start`. Finish is unified.
**Migration**: SPA "Reset" button: call `/abandon` then `/start` with the same difficulty.
