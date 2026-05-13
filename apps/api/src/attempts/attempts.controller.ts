import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { StartAttemptRequestSchema, FinishAttemptRequestSchema } from '@brain-games/shared';

@Controller('games/:slug/attempts')
export class AttemptsController {
  constructor(private attemptsService: AttemptsService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async start(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Body(new ZodPipe(StartAttemptRequestSchema)) body: { difficultyKey: string },
  ) {
    return this.attemptsService.startAttempt(user.id, slug, body.difficultyKey);
  }

  @Post(':attemptId/start-playing')
  @UseGuards(JwtAuthGuard)
  async startPlaying(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.attemptsService.startPlaying(user.id, slug, attemptId);
  }

  @Post(':attemptId/finish')
  @UseGuards(JwtAuthGuard)
  async finish(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Param('attemptId') attemptId: string,
    @Body() body: unknown,
  ) {
    return this.attemptsService.finishAttempt(user.id, slug, attemptId, body);
  }
}
