import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { LifeGameModule } from './games/life-game/life-game.module';
import { PreciseCharacterGameModule } from './games/precise-character-building/precise-character-game.module';
import { AttemptsModule } from './attempts/attempts.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    GamesModule,
    LifeGameModule,
    PreciseCharacterGameModule,
    AttemptsModule,
    LeaderboardsModule,
  ],
})
export class AppModule {}
