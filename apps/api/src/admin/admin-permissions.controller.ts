import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UseGuards, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

const KEY_REGEX = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminPermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('role:read')
  list() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  @Post()
  @RequirePermission('permission:create')
  async create(@Body() body: { key: string; description?: string }) {
    const key = body.key?.trim();
    if (!key || !KEY_REGEX.test(key)) {
      throw new BadRequestException({ error: 'invalid-key-format', message: 'key 必须为 resource:action 格式（小写字母/数字/连字符）' });
    }
    if (key.length > 100) {
      throw new BadRequestException({ error: 'key-too-long', message: 'key 不能超过 100 字符' });
    }

    const [resource, action] = splitKey(key);

    try {
      return await this.prisma.permission.create({
        data: { key, resource, action, description: body.description?.trim() || null },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ error: 'permission-key-taken', message: `权限 key "${key}" 已存在` });
      }
      throw e;
    }
  }

  @Patch(':id')
  @RequirePermission('permission:update')
  async update(@Param('id') id: string, @Body() body: { description?: string }) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException();

    return this.prisma.permission.update({
      where: { id },
      data: { description: body.description?.trim() || null },
    });
  }

  @Delete(':id')
  @RequirePermission('permission:delete')
  async remove(@Param('id') id: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException();

    const roleCount = await this.prisma.rolePermission.count({ where: { permissionId: id } });
    if (roleCount > 0) {
      throw new ConflictException({
        error: 'permission-in-use',
        message: `该权限被 ${roleCount} 个角色引用，请先从角色中移除`,
        roleCount,
      });
    }

    await this.prisma.permission.delete({ where: { id } });
    return { ok: true };
  }
}

function splitKey(key: string): [string, string] {
  const idx = key.indexOf(':');
  return [key.slice(0, idx), key.slice(idx + 1)];
}
