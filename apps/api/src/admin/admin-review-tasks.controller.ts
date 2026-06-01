import { Body, Controller, Get, Param, Post, Query, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma.service';
import { ScoreRecordingService } from '../leaderboards/score-recording.service';

@Controller('admin/review-tasks')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminReviewTasksController {
  constructor(private prisma: PrismaService, private scoreRecording: ScoreRecordingService) {}

  @Get()
  @RequirePermission('review-task:read')
  list(@Query('status') status: string = 'DRAFT', @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.prisma.adminReviewTask.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: Math.min(parseInt(pageSize), 100),
    });
  }

  @Get(':id')
  @RequirePermission('review-task:read')
  async detail(@Param('id') id: string) {
    const task = await this.prisma.adminReviewTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException();
    if (task.resourceType === 'GameAttempt') {
      const attempt = await this.prisma.gameAttempt.findUnique({
        where: { id: task.resourceId },
        include: { validationReports: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      return { task, attempt };
    }
    return { task };
  }

  @Post(':id/decide')
  @RequireAnyPermission('review-task:approve', 'review-task:reject')
  async decide(
    @Param('id') id: string,
    @Body() body: { decision: 'REVOKED' | 'ADMIN_CORRECTED'; reviewComment?: string },
    @CurrentUser() user: { id: string; permissionKeys?: string[] },
  ) {
    const task = await this.prisma.adminReviewTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException();
    if (task.status !== 'DRAFT') throw new ConflictException({ error: 'task-already-decided' });
    if (body.decision === 'ADMIN_CORRECTED' && !user.permissionKeys?.includes('review-task:approve')) {
      throw new ConflictException({ error: 'forbidden-decision' });
    }
    if (body.decision === 'REVOKED' && !user.permissionKeys?.includes('review-task:reject')) {
      throw new ConflictException({ error: 'forbidden-decision' });
    }

    if (task.resourceType !== 'GameAttempt') {
      await this.prisma.adminReviewTask.update({
        where: { id }, data: { status: 'ARCHIVED', reviewedByUserId: user.id, reviewedAt: new Date(), reviewComment: body.reviewComment },
      });
      return { ok: true };
    }

    const targetStatus = body.decision === 'REVOKED' ? 'REVOKED' : 'ADMIN_CORRECTED';
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.gameAttempt.findUniqueOrThrow({ where: { id: task.resourceId } });
      await tx.gameAttempt.updateMany({
        where: { id: attempt.id, status: 'REVIEW_REQUIRED' },
        data: { status: targetStatus, statusVersion: { increment: 1 } },
      });
      if (body.decision === 'ADMIN_CORRECTED') {
        const fresh = await tx.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
        await this.scoreRecording.recordScores(fresh, (fresh.metricsSummary ?? {}) as any, tx);
      } else {
        await tx.scoreRecord.updateMany({
          where: { attemptId: attempt.id, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date(), revokedByUserId: user.id, revokedReason: body.reviewComment ?? 'admin-revoked' },
        });
      }
      await tx.adminReviewTask.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          reviewedByUserId: user.id, reviewedAt: new Date(), reviewComment: body.reviewComment,
        },
      });
      return { ok: true, attemptStatus: targetStatus };
    });
  }
}
