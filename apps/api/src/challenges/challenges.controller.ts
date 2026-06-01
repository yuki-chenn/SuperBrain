import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private svc: ChallengesService) {}

  private ctx(req: Request) {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] as string | undefined };
  }

  @Post('start')
  start(
    @CurrentUser() user: { id: string },
    @Body() body: { gameSlug: string; mode: any; difficultyKey: string; puzzleSlug?: string; idempotencyKey?: string },
    @Req() req: Request,
  ) {
    return this.svc.start({ userId: user.id, ...body }, this.ctx(req));
  }

  @Post(':attemptId/claim')
  claim(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body() body: { entryToken: string; playSessionId: string },
    @Req() req: Request,
  ) {
    return this.svc.claim({ userId: user.id, attemptId, ...body }, this.ctx(req));
  }

  @Post(':attemptId/heartbeat')
  heartbeat(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body() body: { playSessionId: string; clientNow?: string; phase?: 'countdown' | 'playing' | 'submitting'; localElapsedMs?: number },
    @Req() req: Request,
  ) {
    return this.svc.heartbeat({ userId: user.id, attemptId, ...body }, this.ctx(req));
  }

  @Post(':attemptId/abandon')
  abandon(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body() body: { playSessionId: string; reason: string },
    @Req() req: Request,
  ) {
    return this.svc.abandon({ userId: user.id, attemptId, ...body }, this.ctx(req));
  }

  @Post(':attemptId/finish')
  finish(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body() body: { playSessionId: string; finalState: unknown; metrics?: Record<string, unknown> },
    @Req() req: Request,
  ) {
    return this.svc.finish({ userId: user.id, attemptId, ...body }, this.ctx(req));
  }

  @Get(':attemptId/status')
  status(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
  ) {
    return this.svc.getStatus({ userId: user.id, attemptId });
  }
}
