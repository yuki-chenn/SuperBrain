import { apiRequest } from '../../lib/api-client';
import type { LeaderboardDefinition, LeaderboardEntriesResponse } from '@brain-games/shared';

export async function getLeaderboardsByGameApi(
  slug: string,
): Promise<LeaderboardDefinition[]> {
  return apiRequest(`/games/${slug}/leaderboards`);
}

export async function getLeaderboardEntriesApi(
  leaderboardSlug: string,
  limit = 50,
  offset = 0,
): Promise<LeaderboardEntriesResponse> {
  return apiRequest(`/leaderboards/${leaderboardSlug}/entries?limit=${limit}&offset=${offset}`);
}
