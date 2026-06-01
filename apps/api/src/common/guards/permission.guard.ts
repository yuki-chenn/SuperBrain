import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../auth/permission.service';
import { PERMISSION_ALL_KEY, PERMISSION_ANY_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissions: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allKeys =
      this.reflector.getAllAndOverride<string[]>(PERMISSION_ALL_KEY, [context.getHandler(), context.getClass()]) ?? [];
    const anyKeys =
      this.reflector.getAllAndOverride<string[]>(PERMISSION_ANY_KEY, [context.getHandler(), context.getClass()]) ?? [];

    if (allKeys.length === 0 && anyKeys.length === 0) {
      return true; // No permission metadata — JwtAuthGuard alone gates the endpoint.
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;
    if (!user?.id) throw new ForbiddenException({ error: 'forbidden', missing: [...allKeys, ...anyKeys] });

    const userPerms = await this.permissions.getUserPermissionKeys(user.id);
    request.user.permissionKeys = userPerms;

    const missingAll = allKeys.filter((k) => !userPerms.includes(k));
    if (missingAll.length > 0) {
      throw new ForbiddenException({ error: 'forbidden', missing: missingAll });
    }
    if (anyKeys.length > 0 && !anyKeys.some((k) => userPerms.includes(k))) {
      throw new ForbiddenException({ error: 'forbidden', missing: anyKeys, mode: 'any' });
    }
    return true;
  }
}
