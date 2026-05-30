import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AbsoluteCommandAdminService } from './absolute-command-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import {
  AdminCreateACPuzzleSchema,
  AdminUpdateACPuzzleSchema,
  AdminSaveMazeVersionSchema,
} from '@brain-games/shared';
import type {
  AdminCreateACPuzzle,
  AdminUpdateACPuzzle,
  AdminSaveMazeVersion,
} from '@brain-games/shared';

@Controller('admin/absolute-command')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AbsoluteCommandAdminController {
  constructor(private adminService: AbsoluteCommandAdminService) {}

  // ─── Puzzle CRUD ───────────────────────────────────────────────────

  @Get('puzzles')
  async listPuzzles(
    @Query('status') status?: string,
    @Query('difficultyLabel') difficultyLabel?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listPuzzles({
      status,
      difficultyLabel,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('puzzles')
  async createPuzzle(
    @CurrentUser() user: { id: string },
    @Body(new ZodPipe(AdminCreateACPuzzleSchema)) body: AdminCreateACPuzzle,
  ) {
    return this.adminService.createPuzzle(body, user.id);
  }

  @Get('puzzles/:id')
  async getPuzzleDetail(@Param('id') id: string) {
    return this.adminService.getPuzzleDetail(id);
  }

  @Patch('puzzles/:id')
  async updatePuzzle(
    @Param('id') id: string,
    @Body(new ZodPipe(AdminUpdateACPuzzleSchema)) body: AdminUpdateACPuzzle,
  ) {
    return this.adminService.updatePuzzle(id, body);
  }

  // ─── Maze version management ───────────────────────────────────────

  @Post('puzzles/:id/versions')
  async saveMazeVersion(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodPipe(AdminSaveMazeVersionSchema)) body: AdminSaveMazeVersion,
  ) {
    return this.adminService.saveMazeVersion(id, body, user.id);
  }

  // ─── Validation ────────────────────────────────────────────────────

  @Post('puzzles/:id/validate')
  async validatePuzzle(@Param('id') id: string) {
    return this.adminService.validatePuzzle(id);
  }

  // ─── Publish / Unpublish ───────────────────────────────────────────

  @Post('puzzles/:id/publish')
  async publishPuzzle(@Param('id') id: string) {
    return this.adminService.publishPuzzle(id);
  }

  @Post('puzzles/:id/unpublish')
  async unpublishPuzzle(@Param('id') id: string) {
    return this.adminService.unpublishPuzzle(id);
  }

  // ─── Attempts ──────────────────────────────────────────────────────

  @Get('puzzles/:id/attempts')
  async getPuzzleAttempts(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getPuzzleAttempts(id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('attempts/:id')
  async getAttemptReplay(@Param('id') id: string) {
    return this.adminService.getAttemptReplay(id);
  }

  // ─── Leaderboard ───────────────────────────────────────────────────

  @Get('puzzles/:id/leaderboard')
  async getPuzzleLeaderboard(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getPuzzleLeaderboard(id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
