import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AdminPuzzlesService } from './admin-puzzles.service';

@Controller('admin/puzzles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminPuzzlesController {
  constructor(private svc: AdminPuzzlesService) {}

  @Get()
  @RequirePermission('puzzle:read')
  list(@Query() q: any) {
    return this.svc.list({
      gameId: q.gameId, status: q.status,
      page: q.page ? +q.page : undefined,
      pageSize: q.pageSize ? +q.pageSize : undefined,
    });
  }

  @Get('versions')
  @RequirePermission('puzzle:read')
  listVersions(@Query() q: any) {
    return this.svc.listVersions({
      gameId: q.gameId, status: q.status,
      page: q.page ? +q.page : undefined,
      pageSize: q.pageSize ? +q.pageSize : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('puzzle:read')
  detail(@Param('id') id: string) { return this.svc.detail(id); }

  @Post()
  @RequirePermission('puzzle:create')
  create(@Body() body: any) { return this.svc.create(body); }

  @Patch(':id')
  @RequirePermission('puzzle:update')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  @RequirePermission('puzzle:delete')
  remove(@Param('id') id: string) { return this.svc.softDelete(id); }

  @Post(':puzzleId/versions')
  @RequirePermission('puzzle-version:create')
  createVersion(@Param('puzzleId') pid: string, @Body() body: any) { return this.svc.createVersion(pid, body); }

  @Patch('versions/:vid')
  @RequirePermission('puzzle-version:create')
  updateVersion(@Param('vid') vid: string, @Body() body: any) { return this.svc.updateVersion(vid, body); }

  @Post('versions/:vid/validate')
  @RequirePermission('puzzle-version:create')
  validate(@Param('vid') vid: string) { return this.svc.validateVersion(vid); }

  @Post('versions/:vid/publish')
  @RequirePermission('puzzle-version:publish')
  publish(@Param('vid') vid: string) { return this.svc.publishVersion(vid); }
}
