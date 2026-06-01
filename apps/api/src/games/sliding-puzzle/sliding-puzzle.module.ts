import { Module } from '@nestjs/common';
import { SlidingPuzzleAdapter } from './sliding-puzzle.adapter';

@Module({ providers: [SlidingPuzzleAdapter], exports: [SlidingPuzzleAdapter] })
export class SlidingPuzzleModule {}
