import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { LifeGameModule } from './life-game/life-game.module';
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
    AttemptsModule,
    LeaderboardsModule,
  ],
})
export class AppModule {}
