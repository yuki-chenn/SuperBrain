import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  user: null,
  accessToken: null,

  async bootstrap() {
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
    // Only clear local state, don't revoke backend session
    // This prevents affecting the player app which shares the same session
    set({
      status: 'anonymous',
      user: null,
      accessToken: null,
    });
    broadcastAuthEvent('logout');
  },
}));
