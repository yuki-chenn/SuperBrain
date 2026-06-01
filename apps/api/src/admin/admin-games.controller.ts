import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AdminGamesService } from './admin-games.service';

@Controller('admin/games')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminGamesController {
  constructor(private svc: AdminGamesService) {}

  @Get()
  @RequirePermission('game:read')
  list() { return this.svc.list(); }

  @Get(':id')
  @RequirePermission('game:read')
  detail(@Param('id') id: string) { return this.svc.detail(id); }

  @Patch(':id')
  @RequirePermission('game:update')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Post(':id/publish')
  @RequirePermission('game:publish')
  publish(@Param('id') id: string) { return this.svc.publish(id); }

  @Post(':id/archive')
  @RequirePermission('game:archive')
  archive(@Param('id') id: string) { return this.svc.archive(id); }

  // Versioned config sub-resources
  @Post(':gameId/rule-sets')
  @RequirePermission('game-config:create')
  createRuleSet(@Param('gameId') gid: string, @Body() body: any) { return this.svc.createRuleSet(gid, body); }

  @Post('rule-sets/:rsvId/activate')
  @RequirePermission('game-config:activate')
  activateRuleSet(@Param('rsvId') id: string) { return this.svc.activateRuleSet(id); }

  @Post(':gameId/difficulties')
  @RequirePermission('game-config:create')
  createDiff(@Param('gameId') gid: string, @Body() body: any) { return this.svc.createDifficulty(gid, body); }

  @Post('difficulties/:diffId/activate')
  @RequirePermission('game-config:activate')
  activateDiff(@Param('diffId') id: string) { return this.svc.activateDifficulty(id); }

  @Post(':gameId/content-policies')
  @RequirePermission('game-config:create')
  createCp(@Param('gameId') gid: string, @Body() body: any) { return this.svc.createContentPolicy(gid, body); }

  @Post('content-policies/:id/activate')
  @RequirePermission('game-config:activate')
  activateCp(@Param('id') id: string) { return this.svc.activateContentPolicy(id); }

  @Post(':gameId/challenge-policies')
  @RequirePermission('game-config:create')
  createChp(@Param('gameId') gid: string, @Body() body: any) { return this.svc.createChallengePolicy(gid, body); }

  @Post('challenge-policies/:id/activate')
  @RequirePermission('game-config:activate')
  activateChp(@Param('id') id: string) { return this.svc.activateChallengePolicy(id); }
}
