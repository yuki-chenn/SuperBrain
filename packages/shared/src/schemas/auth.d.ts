import { z } from 'zod';
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    password: string;
}, {
    email: string;
    username: string;
    password: string;
}>;
export declare const LoginSchema: z.ZodObject<{
    emailOrUsername: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    emailOrUsername: string;
}, {
    password: string;
    emailOrUsername: string;
}>;
export declare const UserStatusSchema: z.ZodEnum<["ACTIVE", "BANNED", "DELETED"]>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    username: z.ZodString;
    displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<["ACTIVE", "BANNED", "DELETED"]>;
    permissionKeys: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    status: "ACTIVE" | "BANNED" | "DELETED";
    id: string;
    permissionKeys: string[];
    displayName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}, {
    email: string;
    username: string;
    status: "ACTIVE" | "BANNED" | "DELETED";
    id: string;
    permissionKeys: string[];
    displayName?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}>;
export declare const AuthResponseSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        username: z.ZodString;
        displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodEnum<["ACTIVE", "BANNED", "DELETED"]>;
        permissionKeys: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        email: string;
        username: string;
        status: "ACTIVE" | "BANNED" | "DELETED";
        id: string;
        permissionKeys: string[];
        displayName?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    }, {
        email: string;
        username: string;
        status: "ACTIVE" | "BANNED" | "DELETED";
        id: string;
        permissionKeys: string[];
        displayName?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    }>;
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user: {
        email: string;
        username: string;
        status: "ACTIVE" | "BANNED" | "DELETED";
        id: string;
        permissionKeys: string[];
        displayName?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    };
    accessToken: string;
}, {
    user: {
        email: string;
        username: string;
        status: "ACTIVE" | "BANNED" | "DELETED";
        id: string;
        permissionKeys: string[];
        displayName?: string | null | undefined;
        avatarUrl?: string | null | undefined;
    };
    accessToken: string;
}>;
//# sourceMappingURL=auth.d.ts.map