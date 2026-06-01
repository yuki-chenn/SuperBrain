# leaderboards Capability (delta for change `redesign-leaderboard-pipeline`)

## REMOVED Requirements

### Requirement: LeaderboardEntry query shape
**Reason**: Replaced by the three-table pipeline (`ScoreRecord` / `LeaderboardBest` / `LeaderboardRankCache`) under the new `leaderboard-pipeline` capability.
**Migration**: Player code that called `GET /api/leaderboards/:slug` and consumed `LeaderboardEntrySchema` MUST switch to `GET /api/leaderboards/:slug?periodKey=...` returning `LeaderboardRankCacheItemSchema` items. The old `LeaderboardEntry` shape no longer exists in the API.

### Requirement: Legacy LeaderboardEntry write on attempt finish
**Reason**: Replaced by `ScoreRecordingService.recordScores(...)` invoked inside `ChallengesService.finish` transaction.
**Migration**: Removed; downstream code SHALL NOT insert `LeaderboardEntry` rows (the table itself was dropped in Change 1).
