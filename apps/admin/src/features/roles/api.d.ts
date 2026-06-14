export interface AdminPermission {
    id: string;
    key: string;
    resource: string;
    action: string;
    description: string | null;
    createdAt: string;
}
export interface AdminRole {
    id: string;
    key: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissionKeys: string[];
}
export declare function adminListPermissionsApi(): Promise<AdminPermission[]>;
export declare function adminCreatePermissionApi(body: {
    key: string;
    description?: string;
}): Promise<AdminPermission>;
export declare function adminUpdatePermissionApi(id: string, body: {
    description?: string;
}): Promise<{
    ok: boolean;
}>;
export declare function adminDeletePermissionApi(id: string): Promise<{
    ok: boolean;
}>;
export declare function adminListRolesApi(): Promise<AdminRole[]>;
export declare function adminCreateRoleApi(body: {
    key: string;
    name: string;
    description?: string;
    permissionKeys?: string[];
}): Promise<AdminRole>;
export declare function adminUpdateRoleApi(id: string, body: {
    name?: string;
    description?: string;
    permissionKeys?: string[];
}): Promise<{
    ok: boolean;
}>;
export declare function adminDeleteRoleApi(id: string): Promise<{
    ok: boolean;
}>;
export interface UserRoleAssignment {
    roleId: string;
    roleKey: string;
    roleName: string;
    assignedAt: string;
}
export declare function adminListUserRolesApi(userId: string): Promise<UserRoleAssignment[]>;
export declare function adminAssignRoleApi(userId: string, roleKey: string): Promise<{
    ok: boolean;
}>;
export declare function adminRevokeRoleApi(userId: string, roleKey: string): Promise<{
    ok: boolean;
}>;
//# sourceMappingURL=api.d.ts.map