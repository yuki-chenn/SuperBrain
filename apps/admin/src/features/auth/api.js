import { apiRequest } from '../../lib/api-client';
export async function loginApi(data) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}
export async function refreshApi() {
    const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Client': 'admin' },
    });
    if (!res.ok) {
        // Silently handle 401 - expected when no valid session exists
        throw new Error('No valid session');
    }
    return res.json();
}
export async function logoutApi() {
    await apiRequest('/auth/logout', { method: 'POST' });
}
export async function getMeApi() {
    return apiRequest('/auth/me');
}
//# sourceMappingURL=api.js.map