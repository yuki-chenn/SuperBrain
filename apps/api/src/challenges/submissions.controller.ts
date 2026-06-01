import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubmissionsService } from './submissions.service';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private svc: SubmissionsService) {}

  @Post(':attemptId/submissions')
  submit(
    @CurrentUser() user: { id: string },
    @Param('attemptId') attemptId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    return this.svc.submit({
      userId: user.id, attemptId,
      submissionType: body.type,
      payload: body.payload,
      idempotencyKey: body.idempotencyKey,
      playSessionId: body.playSessionId,
      hints: { roundIndex: body.roundIndex, regionId: body.regionId, seq: body.seq },
    }, { ipAddress: req.ip, userAgent: req.headers['user-agent'] as string | undefined });
  }
}
