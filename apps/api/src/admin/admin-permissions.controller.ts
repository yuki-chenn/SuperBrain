import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { PrismaService } from '../database/prisma.service';

@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminPermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('role:read')
  list() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }
}
