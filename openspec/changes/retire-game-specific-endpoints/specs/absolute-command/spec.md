# absolute-command Capability (delta for change `retire-game-specific-endpoints`)

## REMOVED Requirements

### Requirement: Command submission endpoint
**Reason**: Replaced by the unified `POST /api/challenges/:id/submissions { type: 'COMMAND', payload: { direction, seq } }`.
**Migration**: SPA calls the unified endpoint. The simulator under `@brain-games/game-engine/absolute-command` is invoked from `AbsoluteCommandAdapter.verifySubmission`. Snapshots written via the adapter return value (`snapshot: { type: 'CHECKPOINT', state }`) replace the legacy `AbsoluteCommandLog` table inserts; `AttemptSnapshot` is the new home.
