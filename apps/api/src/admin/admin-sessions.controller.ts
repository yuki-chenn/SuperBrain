import {
  Body, Controller, Delete, Get, NotFoundException, Param, Post, Query,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AdminSessionsService } from './admin-sessions.service';

@Controller('admin/sessions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminSessionsController {
  constructor(private sessions: AdminSessionsService) {}

  @Get('stats')
  @RequirePermission('session:read')
  stats() {
    return this.sessions.stats();
  }

  @Get()
  @RequirePermission('session:read')
  list(
    @Query('status') status?: string,
    @Query('client') client?: string,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('familyId') familyId?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('expiresFrom') expiresFrom?: string,
    @Query('expiresTo') expiresTo?: string,
    @Query('special') special?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortField') sortField?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.sessions.list({
      status, client, userId, sessionId, familyId, ipAddress,
      createdFrom, createdTo, expiresFrom, expiresTo, special,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortField, sortDir: sortDir as 'asc' | 'desc' | undefined,
    });
  }

  @Get(':id')
  @RequirePermission('session:read')
  async getDetail(@Param('id') id: string) {
    const session = await this.sessions.getDetail(id);
    if (!session) throw new NotFoundException();
    return session;
  }

  @Post(':id/revoke')
  @RequirePermission('session:revoke')
  async revoke(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    if (!body.reason?.trim()) {
      throw new BadRequestException({ error: 'reason-required', message: '请填写撤销原因' });
    }
    const result = await this.sessions.revokeSession(id, body.reason.trim());
    if (!result) throw new NotFoundException();
    if ((result as any).error) return result;
    return { ok: true };
  }

  @Post('family/:familyId/revoke')
  @RequirePermission('session:revoke')
  async revokeFamily(
    @Param('familyId') familyId: string,
    @Body() body: { reason?: string },
  ) {
    if (!body.reason?.trim()) {
      throw new BadRequestException({ error: 'reason-required', message: '请填写撤销原因' });
    }
    const result = await this.sessions.revokeFamily(familyId, body.reason.trim());
    return { ok: true, ...result };
  }
}
