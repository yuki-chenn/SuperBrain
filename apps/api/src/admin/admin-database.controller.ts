import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AdminDatabaseService } from './admin-database.service';

@Controller('admin/database')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminDatabaseController {
  constructor(private db: AdminDatabaseService) {}

  @Get('tables')
  @RequirePermission('database:read')
  listTables() {
    return this.db.listTables();
  }

  @Get('tables/:tableName')
  @RequirePermission('database:read')
  getTableData(
    @Param('tableName') tableName: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.db.getTableData(
      tableName,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 200) : 50,
    );
  }
}
