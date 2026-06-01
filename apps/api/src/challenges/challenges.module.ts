import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { GamesModule } from '../games/games.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';
import { ChallengesController } from './challenges.controller';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { ChallengesService } from './challenges.service';
import { EntryTokenService } from './entry-token.service';
import { RuntimeSessionService } from './runtime-session.service';
import { ChallengeAuditService } from './challenge-audit.service';
import { ChallengeReaperWorker } from './challenge-reaper.worker';

@Module({
  imports: [PrismaModule, GamesModule, LeaderboardsModule],
  controllers: [ChallengesController, SubmissionsController],
  providers: [
    ChallengesService,
    EntryTokenService,
    RuntimeSessionService,
    ChallengeAuditService,
    ChallengeReaperWorker,
    SubmissionsService,
  ],
  exports: [ChallengesService, ChallengeAuditService],
})
export class ChallengesModule {}
