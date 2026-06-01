import {
  Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards, ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { PrismaService } from '../database/prisma.service';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminRolesController {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.role.create({
      data: {
        key: body.key,
        name: body.name,
        description: body.description ?? null,
        isSystem: false,
        rolePermissions: body.permissionKeys
          ? {
              create: await this.resolvePermissionRefs(body.permissionKeys),
            }
          : undefined,
      },
    });
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
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermission('role:assign-super-admin')
  async remove(@Param('id') id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException();
    if (role.isSystem) throw new ConflictException({ error: 'role-is-system' });
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  private async resolvePermissionRefs(keys: string[]) {
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: keys } }, select: { id: true },
    });
    return perms.map((p) => ({ permissionId: p.id }));
  }
}
