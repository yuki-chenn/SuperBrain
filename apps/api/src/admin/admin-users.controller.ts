import {
  Controller, Get, Patch, Post, Param, Body, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private usersService: AdminUsersService) {}

  @Get()
  async listUsers(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.list({
      keyword, status, role,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getDetail(id);
  }

  @Patch(':id')
  async updateUser(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
    @Body() body: { role?: string },
  ) {
    return this.usersService.update(id, body, admin);
  }

  @Post(':id/ban')
  async banUser(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
  ) {
    return this.usersService.ban(id, admin);
  }

  @Post(':id/unban')
  async unbanUser(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
  ) {
    return this.usersService.unban(id, admin);
  }

  @Get(':id/sessions')
  async getSessions(@Param('id') id: string) {
    return this.usersService.getSessions(id);
  }

  @Post(':id/sessions/:sessionId/revoke')
  async revokeSession(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.usersService.revokeSession(id, sessionId, admin);
  }

  @Post(':id/sessions/revoke-all')
  async revokeAllSessions(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
  ) {
    return this.usersService.revokeAllSessions(id, admin);
  }
}
