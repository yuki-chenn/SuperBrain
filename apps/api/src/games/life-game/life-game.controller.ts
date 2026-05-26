import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LifeGameService } from './life-game.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { SubmitLifeRegionRequestSchema } from '@brain-games/shared';

@Controller('games/life-game/attempts')
export class LifeGameController {
  constructor(private lifeGameService: LifeGameService) {}

  @Get(':attemptId')
  @UseGuards(JwtAuthGuard)
  async getAttempt(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.lifeGameService.getAttempt(user.id, attemptId);
  }

  @Post(':attemptId/regions/:regionId/submit')
  @UseGuards(JwtAuthGuard)
  async submitRegion(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Param('regionId') regionId: string,
    @Body(new ZodPipe(SubmitLifeRegionRequestSchema)) body: { aliveCells: Array<{ x: number; y: number }> },
  ) {
    return this.lifeGameService.submitRegion(
      user.id,
      attemptId,
      parseInt(regionId, 10),
      body.aliveCells,
    );
  }

  @Get(':attemptId/answers')
  @UseGuards(JwtAuthGuard)
  async getAnswers(
    @CurrentUser() user: { id: string; role: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.lifeGameService.getAnswers(user.id, user.role, attemptId);
  }

  @Post(':attemptId/abandon')
  @UseGuards(JwtAuthGuard)
  async abandonAttempt(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.lifeGameService.abandonAttempt(user.id, attemptId);
  }
}
