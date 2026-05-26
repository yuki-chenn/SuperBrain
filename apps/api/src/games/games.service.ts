import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { GameAdapter } from './game-adapter.interface';
import { SlidingPuzzleAdapter } from './sliding-puzzle/sliding-puzzle.adapter';
import { LifeGameAdapter } from './life-game/life-game.adapter';
import { PreciseCharacterBuildingAdapter } from './precise-character-building/precise-character-building.adapter';

@Injectable()
export class GamesService {
  private adapters = new Map<string, GameAdapter>();

  constructor(
    private prisma: PrismaService,
    slidingPuzzleAdapter: SlidingPuzzleAdapter,
    lifeGameAdapter: LifeGameAdapter,
    pcbAdapter: PreciseCharacterBuildingAdapter,
  ) {
    this.adapters.set(slidingPuzzleAdapter.slug, slidingPuzzleAdapter);
    this.adapters.set(lifeGameAdapter.slug, lifeGameAdapter);
    this.adapters.set(pcbAdapter.slug, pcbAdapter);
  }

  async findAll(status = 'PUBLISHED') {
    const games = await this.prisma.game.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'asc' },
    });
    return { items: games };
  }

  async findBySlug(slug: string) {
    const game = await this.prisma.game.findUnique({ where: { slug } });
    if (!game) throw new NotFoundException(`Game '${slug}' not found`);
    return game;
  }

  getAdapter(slug: string): GameAdapter {
    const adapter = this.adapters.get(slug);
    if (!adapter) throw new NotFoundException(`No adapter for game '${slug}'`);
    return adapter;
  }
}
