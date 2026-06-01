import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@brain-games/shared';
import { loginApi, logoutApi, refreshApi } from './api';
import { broadcastAuthEvent } from './broadcast';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;

  bootstrap: () => Promise<void>;
  setAuthenticated: (input: { user: User; accessToken: string }) => void;
  setAnonymous: () => void;
  login: (input: { emailOrUsername: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'bootstrapping',
      user: null,
      accessToken: null,

      async bootstrap() {
        const stored = get();

        // If we have a stored token, try to use it directly
        if (stored.accessToken && stored.user) {
          try {
            // Validate the stored token by calling /auth/me
            const res = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${stored.accessToken}` },
            });
            if (res.ok) {
              set({ status: 'authenticated' });
              return;
            }
          } catch {
            // Token invalid, fall through to refresh
          }
        }

        // Try refresh (will 401 if no valid session cookie)
        try {
          const data = await refreshApi();
          set({
            status: 'authenticated',
            user: data.user,
            accessToken: data.accessToken,
          });
        } catch {
          set({
            status: 'anonymous',
            user: null,
            accessToken: null,
          });
        }
      },

      setAuthenticated(input) {
        set({
          status: 'authenticated',
          user: input.user,
          accessToken: input.accessToken,
        });
      },

      setAnonymous() {
        set({
          status: 'anonymous',
          user: null,
          accessToken: null,
        });
      },

      async login(input) {
        const data = await loginApi(input);
        set({
          status: 'authenticated',
          user: data.user,
          accessToken: data.accessToken,
        });
        broadcastAuthEvent('login');
      },

      async logout() {
        set({
          status: 'anonymous',
          user: null,
          accessToken: null,
        });
        broadcastAuthEvent('logout');
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
);
