import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { SlidingPuzzleAdapter } from './adapters/sliding-puzzle.adapter';
import { LifeGameAdapter } from './adapters/life-game.adapter';

@Module({
  controllers: [GamesController],
  providers: [GamesService, SlidingPuzzleAdapter, LifeGameAdapter],
  exports: [GamesService],
})
export class GamesModule {}
