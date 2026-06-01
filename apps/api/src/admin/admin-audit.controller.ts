import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AuditService } from './audit.service';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminAuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @RequirePermission('admin-audit-log:read')
  async listLogs(
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.list({
      action, resourceType, actorUserId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('admin-audit-log:read')
  async getLog(@Param('id') id: string) {
    return this.audit.getOne(id);
  }
}
