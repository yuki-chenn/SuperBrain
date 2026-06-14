import {
  Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post,
  UseGuards, ConflictException, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { PermissionCacheService } from '../auth/permission-cache.service';

const ROLE_KEY_REGEX = /^[a-z][a-z0-9_]*$/;

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminRolesController {
  constructor(
    private prisma: PrismaService,
    private permCache: PermissionCacheService,
  ) {}

  @Get()
  @RequirePermission('role:read')
  async list() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: { select: { key: true } } } },
      },
      orderBy: [{ isSystem: 'desc' }, { key: 'asc' }],
    });
    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissionKeys: r.rolePermissions.map((rp) => rp.permission.key).sort(),
    }));
  }

  @Post()
  @RequirePermission('role:assign')
  async create(@Body() body: { key: string; name: string; description?: string; permissionKeys?: string[] }) {
    const key = body.key?.trim();
    if (!key || !ROLE_KEY_REGEX.test(key)) {
      throw new BadRequestException({ error: 'invalid-key-format', message: '角色 key 必须为小写字母、数字、下划线组成' });
    }

    let permissionCreates: { permissionId: string }[] | undefined;
    if (body.permissionKeys?.length) {
      permissionCreates = await this.resolvePermissionRefsOrThrow(body.permissionKeys);
    }

    try {
      return await this.prisma.role.create({
        data: {
          key,
          name: body.name,
          description: body.description ?? null,
          isSystem: false,
          rolePermissions: permissionCreates ? { create: permissionCreates } : undefined,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ error: 'role-key-taken', message: `角色 key "${key}" 已存在` });
      }
      throw e;
    }
  }

  @Patch(':id')
  @RequirePermission('role:assign-super-admin')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; permissionKeys?: string[] },
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException();
    const ops: Promise<unknown>[] = [];
    ops.push(
      this.prisma.role.update({
        where: { id },
        data: { name: body.name ?? role.name, description: body.description ?? role.description },
      }),
    );
    if (body.permissionKeys) {
      const perms = await this.prisma.permission.findMany({
        where: { key: { in: body.permissionKeys } },
        select: { id: true, key: true },
      });
      const resolvedKeys = new Set(perms.map((p) => p.key));
      const unknownKeys = body.permissionKeys.filter((k) => !resolvedKeys.has(k));
      if (unknownKeys.length > 0) {
        throw new BadRequestException({ error: 'unknown-permission-keys', keys: unknownKeys });
      }
      const targetIds = new Set(perms.map((p) => p.id));
      const existing = await this.prisma.rolePermission.findMany({
        where: { roleId: id }, select: { permissionId: true },
      });
      const existingIds = new Set(existing.map((e) => e.permissionId));

      for (const pid of targetIds) if (!existingIds.has(pid)) {
        ops.push(this.prisma.rolePermission.create({ data: { roleId: id, permissionId: pid } }));
      }
      for (const pid of existingIds) if (!targetIds.has(pid)) {
        ops.push(this.prisma.rolePermission.delete({
          where: { roleId_permissionId: { roleId: id, permissionId: pid } },
        }));
      }
    }
    await Promise.all(ops);
    await this.invalidateRoleUsers(id);
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermission('role:assign-super-admin')
  async remove(@Param('id') id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException();
    if (role.isSystem) throw new ConflictException({ error: 'role-is-system' });
    await this.invalidateRoleUsers(id);
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  private async invalidateRoleUsers(roleId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    await this.permCache.invalidateMany(userRoles.map((ur) => ur.userId));
  }

  private async resolvePermissionRefsOrThrow(keys: string[]) {
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: keys } }, select: { id: true, key: true },
    });
    const resolvedKeys = new Set(perms.map((p) => p.key));
    const unknownKeys = keys.filter((k) => !resolvedKeys.has(k));
    if (unknownKeys.length > 0) {
      throw new BadRequestException({ error: 'unknown-permission-keys', keys: unknownKeys });
    }
    return perms.map((p) => ({ permissionId: p.id }));
  }
}
