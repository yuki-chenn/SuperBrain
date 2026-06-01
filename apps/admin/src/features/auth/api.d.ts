import type { AuthResponse, User } from '@brain-games/shared';
export declare function loginApi(data: {
    emailOrUsername: string;
    password: string;
}): Promise<AuthResponse>;
export declare function refreshApi(): Promise<{
    user: User;
    accessToken: string;
}>;
export declare function logoutApi(): Promise<void>;
export declare function getMeApi(): Promise<User>;
//# sourceMappingURL=api.d.ts.map