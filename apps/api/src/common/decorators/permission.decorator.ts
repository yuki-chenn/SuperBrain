import { SetMetadata } from '@nestjs/common';

export const PERMISSION_ALL_KEY = 'rbac:all';
export const PERMISSION_ANY_KEY = 'rbac:any';

/** Endpoint requires the authenticated user to hold ALL listed permission keys. */
export const RequirePermission = (...keys: string[]) => SetMetadata(PERMISSION_ALL_KEY, keys);

/** Endpoint requires the authenticated user to hold AT LEAST ONE of the listed permission keys. */
export const RequireAnyPermission = (...keys: string[]) => SetMetadata(PERMISSION_ANY_KEY, keys);
