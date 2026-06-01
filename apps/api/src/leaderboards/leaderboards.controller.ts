import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LeaderboardsService } from './leaderboards.service';

@Controller('leaderboards')
@UseGuards(JwtAuthGuard)
export class LeaderboardsController {
  constructor(private svc: LeaderboardsService) {}

  @Get()
  list(@Query() q: any) {
    return this.svc.list({
      gameId: q.gameId, difficultyId: q.difficultyId,
      mode: q.mode, periodType: q.periodType,
    });
  }

  @Get(':slug')
  detail(
    @Param('slug') slug: string,
    @Query() q: any,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.detail(slug, {
      periodKey: q.periodKey,
      offset: q.offset ? +q.offset : undefined,
      limit: q.limit ? +q.limit : undefined,
      userId: user?.id,
    });
  }

  @Get(':slug/periods')
  periods(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.svc.listPeriods(slug, limit ? +limit : undefined);
  }
}
