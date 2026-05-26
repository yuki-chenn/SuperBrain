import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { SlidingPuzzleAdapter } from './sliding-puzzle/sliding-puzzle.adapter';
import { LifeGameAdapter } from './life-game/life-game.adapter';
import { PreciseCharacterBuildingAdapter } from './precise-character-building/precise-character-building.adapter';

@Module({
  controllers: [GamesController],
  providers: [GamesService, SlidingPuzzleAdapter, LifeGameAdapter, PreciseCharacterBuildingAdapter],
  exports: [GamesService],
})
export class GamesModule {}
