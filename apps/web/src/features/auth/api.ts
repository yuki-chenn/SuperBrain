import { apiRequest } from '../../lib/api-client';
import type { AuthResponse, User } from '@brain-games/shared';

export async function registerApi(data: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginApi(data: {
  emailOrUsername: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refreshApi(): Promise<{ user: User; accessToken: string }> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Client': 'game' },
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}

export async function logoutApi(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
}

export async function getMeApi(): Promise<User> {
  return apiRequest('/auth/me');
}
