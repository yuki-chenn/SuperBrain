# life-game Capability (delta for change `retire-game-specific-endpoints`)

## REMOVED Requirements

### Requirement: Region submission endpoint
**Reason**: Replaced by the unified `POST /api/challenges/:id/submissions { type: 'REGION', payload, ... }` (capability `submissions`).
**Migration**: SPA must call the unified endpoint; the dedicated controller and DTO under `apps/api/src/games/life-game/` are deleted. The runtime validator (`@brain-games/game-engine/life-game`) is preserved and invoked from `LifeGameAdapter.verifySubmission`.

### Requirement: Life-game specific finish/abandon rejection
**Reason**: The rejection rules from the legacy `attempts` capability are obsolete since Change 3 unified `finish` and `abandon`. Mid-game submissions are now also unified per the `submissions` capability.
**Migration**: Remove any `LifeGame` checks on `/api/challenges/:id/finish` that required prior region submissions. The new `finalReady=true` signal from `verifySubmission` informs the SPA but does not block the server-side finish; the adapter's `finishAttempt` is the authoritative validator.
