import { Module } from '@nestjs/common';
import { LifeGameController } from './life-game.controller';
import { LifeGameService } from './life-game.service';
import { GamesModule } from '../games.module';
import { LeaderboardsModule } from '../../leaderboards/leaderboards.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [GamesModule, LeaderboardsModule, PrismaModule],
  controllers: [LifeGameController],
  providers: [LifeGameService],
  exports: [LifeGameService],
})
export class LifeGameModule {}
