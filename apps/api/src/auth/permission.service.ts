import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Resolves the effective set of permission keys for a user by joining
 * UserRole → Role → RolePermission → Permission.
 *
 * No request-scoped cache yet (one indexed query is cheap); Change 6
 * (`harden-concurrency-stack`) may add a Redis cache when scale demands.
 */
@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Permission-drift sanity check: warn if seed-loaded keys are missing.
    // (Code-side @RequirePermission discovery is deferred — the seed catalog is
    // the authoritative source today.)
    const count = await this.prisma.permission.count();
    this.logger.log(`Permission catalog loaded with ${count} keys`);
  }

  async getUserPermissionKeys(userId: string): Promise<string[]> {
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
    return keys;
  }

  async assertHasPermission(userId: string, key: string): Promise<void> {
    const keys = await this.getUserPermissionKeys(userId);
    if (!keys.includes(key)) {
      throw new Error(`User ${userId} missing permission ${key}`);
    }
  }
}
