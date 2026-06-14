import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AdminUsersService } from './admin-users.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionCacheService } from '../auth/permission-cache.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminUsersController {
  constructor(
    private adminUsers: AdminUsersService,
    private users: UsersService,
    private permCache: PermissionCacheService,
  ) {}

  @Get()
  @RequirePermission('user:read')
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminUsers.paginate({
      search, status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('user:read')
  detail(@Param('id') id: string) {
    return this.adminUsers.getDetail(id);
  }

  @Post(':id/ban')
  @RequirePermission('user:ban')
  ban(@Param('id') id: string) {
    return this.adminUsers.ban(id);
  }

  @Post(':id/unban')
  @RequirePermission('user:ban')
  unban(@Param('id') id: string) {
    return this.adminUsers.unban(id);
  }

  @Get(':id/roles')
  @RequirePermission('role:read')
  listRoles(@Param('id') id: string) {
    return this.users.listRolesForUser(id);
  }

  @Post(':id/roles')
  @RequirePermission('role:assign')
  async assignRole(
    @Param('id') id: string,
    @Body() body: { roleKey: string },
    @CurrentUser() actor: { id: string; permissionKeys?: string[] },
  ) {
    if (body.roleKey === 'super_admin' && !actor.permissionKeys?.includes('role:assign-super-admin')) {
      const err: any = new Error('forbidden');
      err.status = 403;
      throw err;
    }
    const result = await this.users.assignRoleByKey(id, body.roleKey, actor.id);
    await this.permCache.invalidate(id);
    return result;
  }

  @Delete(':id/roles/:roleKey')
  @RequirePermission('role:assign')
  async revokeRole(@Param('id') id: string, @Param('roleKey') roleKey: string) {
    const result = await this.users.revokeRoleByKey(id, roleKey);
    await this.permCache.invalidate(id);
    return result;
  }
}
