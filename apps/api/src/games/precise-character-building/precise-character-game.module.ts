import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { PreciseCharacterBuildingAdapter } from './precise-character-building.adapter';

@Module({
  imports: [PrismaModule],
  providers: [PreciseCharacterBuildingAdapter],
  exports: [PreciseCharacterBuildingAdapter],
})
export class PreciseCharacterGameModule {}
