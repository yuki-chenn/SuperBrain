import { apiRequest } from '../../lib/api-client';

// ─── Helper ──────────────────────────────────────────────────────

function buildQuery(params?: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export interface AdminGame {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  source?: string;
  coverUrl?: string;
  status: string;
  sortOrder: number;
  difficultyLevels: any[];
  metadata: any;
  puzzleCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  ruleSetVersions?: any[];
  difficulties?: any[];
  contentPolicies?: any[];
  challengePolicies?: any[];
}

export interface AdminGameListResponse {
  items: AdminGame[];
  total: number;
}

export async function adminListGamesApi(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminGameListResponse> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/games${qs ? `?${qs}` : ''}`);
}

export async function adminGetGameApi(gameId: string): Promise<AdminGame> {
  return apiRequest(`/admin/games/${gameId}`);
}

export async function adminUpdateGameApi(gameId: string, input: Partial<AdminGame>): Promise<{ success: boolean }> {
  return apiRequest(`/admin/games/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function adminPublishGameApi(gameId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/games/${gameId}/publish`, { method: 'POST' });
}

export async function adminArchiveGameApi(gameId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/games/${gameId}/archive`, { method: 'POST' });
}

export async function adminUpdateDimensionsApi(
  gameId: string,
  dimensions: Array<{ key: string; label: string; value: number }>,
): Promise<{ success: boolean; dimensions: Array<{ key: string; label: string; value: number }> }> {
  return apiRequest(`/admin/games/${gameId}/dimensions`, {
    method: 'PATCH',
    body: JSON.stringify({ dimensions }),
  });
}

// ─── Sub-entity types ────────────────────────────────────────────

export interface AdminDifficulty {
  id: string;
  gameId: string;
  key: string;
  label: string;
  version: number;
  sortOrder: number;
  maxDurationMs: number | null;
  config: any;
  configHash: string;
  status: string;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  game?: { id: string; title: string; slug: string };
  contentPolicies?: AdminContentPolicy[];
  challengePolicies?: AdminChallengePolicy[];
}

export interface AdminContentPolicy {
  id: string;
  gameId: string;
  difficultyId: string | null;
  mode: string | null;
  contentMode: string;
  selectionStrategy: string;
  generatorKey: string | null;
  generatorConfig: any;
  puzzlePoolFilter: any;
  scheduleGranularity: string | null;
  allowRepeatedPuzzle: boolean;
  repeatCooldownHours: number | null;
  weightConfig: any;
  status: string;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  game?: { id: string; title: string; slug: string };
}

export interface AdminRuleVersion {
  id: string;
  gameId: string;
  version: number;
  name: string;
  engineKey: string;
  engineVersion: string | null;
  schemaVersion: number;
  config: any;
  configHash: string;
  validationStatus: string;
  validationReport: any;
  status: string;
  activatedAt: string | null;
  createdAt: string;
  game?: { id: string; title: string; slug: string };
}

export interface AdminChallengePolicy {
  id: string;
  gameId: string;
  mode: string;
  difficultyId: string | null;
  allowResume: boolean;
  allowMultipleActive: boolean;
  requiresHeartbeat: boolean;
  heartbeatIntervalSec: number;
  heartbeatTimeoutSec: number;
  operationLogMode: string;
  operationBatchSize: number;
  snapshotEveryNEvents: number | null;
  saveInitialSnapshot: boolean;
  saveFinalSnapshot: boolean;
  eligibleForLeaderboard: boolean;
  maxSubmitRetry: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  game?: { id: string; title: string; slug: string };
}

export interface EntityListResponse<T> {
  items: T[];
  total: number;
}

// ─── Difficulty APIs ─────────────────────────────────────────────

export async function adminListDifficultiesApi(params?: { gameId?: string; status?: string; key?: string }): Promise<EntityListResponse<AdminDifficulty>> {
  return apiRequest(`/admin/games/difficulties${buildQuery(params)}`);
}

export async function adminGetDifficultyApi(id: string): Promise<AdminDifficulty> {
  return apiRequest(`/admin/games/difficulties/${id}`);
}

export async function adminUpdateDifficultyApi(id: string, body: Partial<AdminDifficulty>): Promise<AdminDifficulty> {
  return apiRequest(`/admin/games/difficulties/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminActivateDifficultyApi(id: string): Promise<AdminDifficulty> {
  return apiRequest(`/admin/games/difficulties/${id}/activate`, { method: 'POST' });
}

// ─── Content Policy APIs ─────────────────────────────────────────

export async function adminListContentPoliciesApi(params?: { gameId?: string; difficultyId?: string; status?: string }): Promise<EntityListResponse<AdminContentPolicy>> {
  return apiRequest(`/admin/games/content-policies${buildQuery(params)}`);
}

export async function adminGetContentPolicyApi(id: string): Promise<AdminContentPolicy> {
  return apiRequest(`/admin/games/content-policies/${id}`);
}

export async function adminUpdateContentPolicyApi(id: string, body: Partial<AdminContentPolicy>): Promise<AdminContentPolicy> {
  return apiRequest(`/admin/games/content-policies/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminActivateContentPolicyApi(id: string): Promise<AdminContentPolicy> {
  return apiRequest(`/admin/games/content-policies/${id}/activate`, { method: 'POST' });
}

// ─── Rule Version APIs ───────────────────────────────────────────

export async function adminListRuleVersionsApi(params?: { gameId?: string; status?: string }): Promise<EntityListResponse<AdminRuleVersion>> {
  return apiRequest(`/admin/games/rule-versions${buildQuery(params)}`);
}

export async function adminGetRuleVersionApi(id: string): Promise<AdminRuleVersion> {
  return apiRequest(`/admin/games/rule-versions/${id}`);
}

export async function adminUpdateRuleVersionApi(id: string, body: Partial<AdminRuleVersion>): Promise<AdminRuleVersion> {
  return apiRequest(`/admin/games/rule-versions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminActivateRuleVersionApi(id: string): Promise<AdminRuleVersion> {
  return apiRequest(`/admin/games/rule-versions/${id}/activate`, { method: 'POST' });
}

// ─── Challenge Policy APIs ───────────────────────────────────────

export async function adminListChallengePoliciesApi(params?: { gameId?: string; difficultyId?: string; status?: string }): Promise<EntityListResponse<AdminChallengePolicy>> {
  return apiRequest(`/admin/games/challenge-policies${buildQuery(params)}`);
}

export async function adminGetChallengePolicyApi(id: string): Promise<AdminChallengePolicy> {
  return apiRequest(`/admin/games/challenge-policies/${id}`);
}

export async function adminUpdateChallengePolicyApi(id: string, body: Partial<AdminChallengePolicy>): Promise<AdminChallengePolicy> {
  return apiRequest(`/admin/games/challenge-policies/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminActivateChallengePolicyApi(id: string): Promise<AdminChallengePolicy> {
  return apiRequest(`/admin/games/challenge-policies/${id}/activate`, { method: 'POST' });
}
