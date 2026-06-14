import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { AdminGamesService } from './admin-games.service';

@Controller('admin/games')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminGamesController {
  constructor(private svc: AdminGamesService) {}

  // ─── Game CRUD ───

  @Get()
  @RequirePermission('game:read')
  list() { return this.svc.list(); }

  // ─── Sub-entity list/detail (static routes MUST come before :id) ───

  @Get('difficulties')
  @RequirePermission('game:read')
  listDifficulties(@Query('gameId') gameId?: string, @Query('status') status?: string, @Query('key') key?: string) {
    return this.svc.listDifficulties({ gameId, status, key });
  }

  @Get('content-policies')
  @RequirePermission('game:read')
  listContentPolicies(@Query('gameId') gameId?: string, @Query('difficultyId') difficultyId?: string, @Query('status') status?: string) {
    return this.svc.listContentPolicies({ gameId, difficultyId, status });
  }

  @Get('rule-versions')
  @RequirePermission('game:read')
  listRuleVersions(@Query('gameId') gameId?: string, @Query('status') status?: string) {
    return this.svc.listRuleVersions({ gameId, status });
  }

  @Get('challenge-policies')
  @RequirePermission('game:read')
  listChallengePolicies(@Query('gameId') gameId?: string, @Query('difficultyId') difficultyId?: string, @Query('status') status?: string) {
    return this.svc.listChallengePolicies({ gameId, difficultyId, status });
  }

  // ─── Sub-entity detail & update ───

  @Get('difficulties/:id')
  @RequirePermission('game:read')
  getDifficulty(@Param('id') id: string) { return this.svc.getDifficulty(id); }

  @Patch('difficulties/:id')
  @RequirePermission('game:update')
  updateDifficulty(@Param('id') id: string, @Body() body: any) { return this.svc.updateDifficulty(id, body); }

  @Get('content-policies/:id')
  @RequirePermission('game:read')
  getContentPolicy(@Param('id') id: string) { return this.svc.getContentPolicy(id); }

  @Patch('content-policies/:id')
  @RequirePermission('game:update')
  updateContentPolicy(@Param('id') id: string, @Body() body: any) { return this.svc.updateContentPolicy(id, body); }

  @Get('rule-versions/:id')
  @RequirePermission('game:read')
  getRuleVersion(@Param('id') id: string) { return this.svc.getRuleVersion(id); }

  @Patch('rule-versions/:id')
  @RequirePermission('game:update')
  updateRuleVersion(@Param('id') id: string, @Body() body: any) { return this.svc.updateRuleVersion(id, body); }

  @Get('challenge-policies/:id')
  @RequirePermission('game:read')
  getChallengePolicy(@Param('id') id: string) { return this.svc.getChallengePolicy(id); }

  @Patch('challenge-policies/:id')
  @RequirePermission('game:update')
  updateChallengePolicy(@Param('id') id: string, @Body() body: any) { return this.svc.updateChallengePolicy(id, body); }

  // ─── Game detail & update (dynamic :id route comes AFTER static routes) ───

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

  // ─── Versioned config create & activate ───

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
