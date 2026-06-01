import type { User } from '@brain-games/shared';
type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';
interface AuthState {
    status: AuthStatus;
    user: User | null;
    accessToken: string | null;
    bootstrap: () => Promise<void>;
    setAuthenticated: (input: {
        user: User;
        accessToken: string;
    }) => void;
    setAnonymous: () => void;
    login: (input: {
        emailOrUsername: string;
        password: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
}
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthState>, "setState" | "persist"> & {
    setState(partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>), replace?: false | undefined): unknown;
    setState(state: AuthState | ((state: AuthState) => AuthState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthState, {
            user: {
                email: string;
                username: string;
                status: "ACTIVE" | "BANNED" | "DELETED";
                id: string;
                permissionKeys: string[];
                displayName?: string | null | undefined;
                avatarUrl?: string | null | undefined;
            } | null;
            accessToken: string | null;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthState) => void) => () => void;
        onFinishHydration: (fn: (state: AuthState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthState, {
            user: {
                email: string;
                username: string;
                status: "ACTIVE" | "BANNED" | "DELETED";
                id: string;
                permissionKeys: string[];
                displayName?: string | null | undefined;
                avatarUrl?: string | null | undefined;
            } | null;
            accessToken: string | null;
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=auth-store.d.ts.map