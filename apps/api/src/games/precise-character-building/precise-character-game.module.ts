import { Module } from '@nestjs/common';
import { PreciseCharacterGameController } from './precise-character-game.controller';
import { PreciseCharacterGameService } from './precise-character-game.service';
import { GamesModule } from '../games.module';
import { LeaderboardsModule } from '../../leaderboards/leaderboards.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [GamesModule, LeaderboardsModule, PrismaModule],
  controllers: [PreciseCharacterGameController],
  providers: [PreciseCharacterGameService],
  exports: [PreciseCharacterGameService],
})
export class PreciseCharacterGameModule {}
