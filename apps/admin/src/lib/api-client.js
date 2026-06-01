import { useAuthStore } from '../features/auth/auth-store';
import { refreshApi } from '../features/auth/api';
const API_BASE = '/api';
export class ApiError extends Error {
    statusCode;
    body;
    constructor(statusCode, message, body) {
        super(message);
        this.statusCode = statusCode;
        this.body = body;
        this.name = 'ApiError';
    }
}
let refreshPromise = null;
async function tryRefresh() {
    if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}
async function doRefresh() {
    try {
        const data = await refreshApi();
        useAuthStore.getState().setAuthenticated({
            user: data.user,
            accessToken: data.accessToken,
        });
        return true;
    }
    catch {
        useAuthStore.getState().setAnonymous();
        return false;
    }
}
export async function apiRequest(path, options = {}) {
    const token = useAuthStore.getState().accessToken;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
    });
    if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            const newToken = useAuthStore.getState().accessToken;
            if (newToken)
                headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers,
                credentials: 'include',
            });
            if (!retryRes.ok) {
                const body = await retryRes.json().catch(() => null);
                throw new ApiError(retryRes.status, body?.message || 'Request failed', body);
            }
            return retryRes.json();
        }
        throw new ApiError(401, 'Unauthorized');
    }
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body?.message || 'Request failed', body);
    }
    return res.json();
}
//# sourceMappingURL=api-client.js.map