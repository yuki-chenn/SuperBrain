import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionCacheService } from './permission-cache.service';

/**
 * Resolves the effective set of permission keys for a user by joining
 * UserRole → Role → RolePermission → Permission.
 *
 * Results are cached in Redis for 5 minutes (key: `perm:{userId}`).
 * The cache is invalidated by admin-roles.controller and admin-users.controller
 * whenever roles or user-role assignments change.
 */
@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private prisma: PrismaService,
    private cache: PermissionCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.permission.count();
    this.logger.log(`Permission catalog loaded with ${count} keys`);
  }

  async getUserPermissionKeys(userId: string): Promise<string[]> {
    const cached = await this.cache.get(userId);
    if (cached) return cached;

    const rows = await this.prisma.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: { some: { userId } },
            },
          },
        },
      },
      select: { key: true },
    });
    const keys = Array.from(new Set(rows.map((r) => r.key))).sort();
    await this.cache.set(userId, keys);
    return keys;
  }

  async assertHasPermission(userId: string, key: string): Promise<void> {
    const keys = await this.getUserPermissionKeys(userId);
    if (!keys.includes(key)) {
      throw new Error(`User ${userId} missing permission ${key}`);
    }
  }
}
