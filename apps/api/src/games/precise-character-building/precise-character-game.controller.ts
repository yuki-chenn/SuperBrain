import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { PreciseCharacterGameService } from './precise-character-game.service';
import { SubmitPCBRoundRequestSchema } from '@brain-games/shared';

@Controller('games/precise-character-building/attempts')
@UseGuards(JwtAuthGuard)
export class PreciseCharacterGameController {
  constructor(private readonly pcbService: PreciseCharacterGameService) {}

  @Get(':attemptId')
  async getAttempt(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.pcbService.getAttempt(user.id, attemptId);
  }

  @Post(':attemptId/rounds/submit')
  async submitRound(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body(new ZodPipe(SubmitPCBRoundRequestSchema))
    body: { selectedRadicalKeys: string[]; selectedCellIndices: number[] },
  ) {
    return this.pcbService.submitRound(
      user.id,
      attemptId,
      body.selectedRadicalKeys,
      body.selectedCellIndices,
    );
  }

  @Get(':attemptId/answers')
  async getAnswers(
    @CurrentUser() user: { id: string; role: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.pcbService.getAnswers(user.id, user.role, attemptId);
  }

  @Post(':attemptId/abandon')
  async abandonAttempt(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.pcbService.abandonAttempt(user.id, attemptId);
  }

  @Post(':attemptId/reset')
  async resetAttempt(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.pcbService.resetAttempt(user.id, attemptId);
  }
}
