import { Global, Module } from '@nestjs/common';
import { GameAdapterRegistry } from './game-adapter-registry.service';

@Global()
@Module({
  providers: [GameAdapterRegistry],
  exports: [GameAdapterRegistry],
})
export class GameAdapterRegistryModule {}
