import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardsService } from './leaderboards.service';
import { ScoreRecordingService } from './score-recording.service';
import { PeriodResolverService } from './period-resolver.service';
import { RankCacheService } from './rank-cache.service';
import { LeaderboardRefreshWorker } from './leaderboard-refresh.worker';

@Module({
  imports: [PrismaModule],
  controllers: [LeaderboardsController],
  providers: [
    LeaderboardsService,
    ScoreRecordingService,
    PeriodResolverService,
    RankCacheService,
    LeaderboardRefreshWorker,
  ],
  exports: [LeaderboardsService, ScoreRecordingService, PeriodResolverService, RankCacheService],
})
export class LeaderboardsModule {}
