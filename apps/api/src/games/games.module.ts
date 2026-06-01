import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { GamesController } from './games.controller';
import { GameAdapterRegistryModule } from './game-adapter-registry.module';
import { SlidingPuzzleModule } from './sliding-puzzle/sliding-puzzle.module';
import { LifeGameModule } from './life-game/life-game.module';
import { PreciseCharacterGameModule } from './precise-character-building/precise-character-game.module';
import { AbsoluteCommandModule } from './absolute-command/absolute-command.module';

@Module({
  imports: [
    PrismaModule,
    GameAdapterRegistryModule,
    SlidingPuzzleModule,
    LifeGameModule,
    PreciseCharacterGameModule,
    AbsoluteCommandModule,
  ],
  controllers: [GamesController],
})
export class GamesModule {}
