import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AbsoluteCommandService } from './absolute-command.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { ExecuteAbsoluteCommandRequestSchema } from '@brain-games/shared';
import type { AbsoluteCommandDirection } from '@brain-games/game-engine';

@Controller('games/absolute-command')
export class AbsoluteCommandController {
  constructor(private acService: AbsoluteCommandService) {}

  // ─── Puzzle endpoints ───────────────────────────────────────────────

  @Get('puzzles')
  async listPuzzles(
    @Query('difficultyLabel') difficultyLabel?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.acService.listPuzzles({
      difficultyLabel,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('puzzles/:puzzleSlug')
  async getPuzzleDetail(@Param('puzzleSlug') puzzleSlug: string) {
    return this.acService.getPuzzleDetail(puzzleSlug);
  }

  @Get('puzzles/:puzzleId/leaderboard')
  async getPuzzleLeaderboard(
    @Param('puzzleId') puzzleId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.acService.getPuzzleLeaderboard(
      puzzleId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
      user?.id,
    );
  }

  // ─── Attempt endpoints ──────────────────────────────────────────────

  @Post('puzzles/:puzzleId/attempts/start')
  @UseGuards(JwtAuthGuard)
  async startAttempt(
    @CurrentUser() user: { id: string },
    @Param('puzzleId') puzzleId: string,
  ) {
    return this.acService.startAttempt(user.id, puzzleId);
  }

  @Get('attempts/:attemptId')
  @UseGuards(JwtAuthGuard)
  async getAttempt(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.acService.getAttempt(user.id, attemptId);
  }

  @Post('attempts/:attemptId/commands')
  @UseGuards(JwtAuthGuard)
  async executeCommand(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body(new ZodPipe(ExecuteAbsoluteCommandRequestSchema)) body: { direction: AbsoluteCommandDirection },
  ) {
    return this.acService.executeCommand(user.id, attemptId, body.direction);
  }

  @Post('attempts/:attemptId/undo')
  @UseGuards(JwtAuthGuard)
  async undo(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.acService.undo(user.id, attemptId);
  }

  @Post('attempts/:attemptId/reset')
  @UseGuards(JwtAuthGuard)
  async reset(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.acService.reset(user.id, attemptId);
  }

  @Post('attempts/:attemptId/abandon')
  @UseGuards(JwtAuthGuard)
  async abandon(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.acService.abandonAttempt(user.id, attemptId);
  }
}
