import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { LifeGameAdapter } from './life-game.adapter';

@Module({
  imports: [PrismaModule],
  providers: [LifeGameAdapter],
  exports: [LifeGameAdapter],
})
export class LifeGameModule {}
