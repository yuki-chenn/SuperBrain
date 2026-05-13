import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { GamesModule } from '../games/games.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';

@Module({
  imports: [GamesModule, LeaderboardsModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
