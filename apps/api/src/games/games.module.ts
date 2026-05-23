import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { SlidingPuzzleAdapter } from '../game-modules/sliding-puzzle/sliding-puzzle.adapter';
import { LifeGameAdapter } from '../game-modules/life-game/life-game.adapter';
import { PreciseCharacterBuildingAdapter } from '../game-modules/precise-character-building/precise-character-building.adapter';

@Module({
  controllers: [GamesController],
  providers: [GamesService, SlidingPuzzleAdapter, LifeGameAdapter, PreciseCharacterBuildingAdapter],
  exports: [GamesService],
})
export class GamesModule {}
