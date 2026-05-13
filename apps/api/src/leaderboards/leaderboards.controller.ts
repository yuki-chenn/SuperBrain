import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';

@Controller()
export class LeaderboardsController {
  constructor(private leaderboardsService: LeaderboardsService) {}

  @Get('games/:slug/leaderboards')
  async getByGame(@Param('slug') slug: string) {
    return this.leaderboardsService.getLeaderboardsByGame(slug);
  }

  @Get('leaderboards/:leaderboardSlug/entries')
  async getEntries(
    @Param('leaderboardSlug') leaderboardSlug: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);
    const o = Math.max(parseInt(offset || '0', 10) || 0, 0);
    return this.leaderboardsService.getEntries(leaderboardSlug, l, o);
  }
}
