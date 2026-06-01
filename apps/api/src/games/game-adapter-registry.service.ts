import { Injectable, NotFoundException } from '@nestjs/common';
import type { GameRuntimeAdapter } from './game-adapter.interface';

@Injectable()
export class GameAdapterRegistry {
  private readonly adapters = new Map<string, GameRuntimeAdapter>();

  register(adapter: GameRuntimeAdapter): void {
    if (this.adapters.has(adapter.engineKey)) {
      throw new Error(`GameRuntimeAdapter for engineKey=${adapter.engineKey} already registered`);
    }
    this.adapters.set(adapter.engineKey, adapter);
  }

  get(engineKey: string): GameRuntimeAdapter {
    const a = this.adapters.get(engineKey);
    if (!a) throw new NotFoundException(`No GameRuntimeAdapter for engineKey=${engineKey}`);
    return a;
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}
