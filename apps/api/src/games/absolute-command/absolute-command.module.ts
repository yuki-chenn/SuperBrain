import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AbsoluteCommandAdapter } from './absolute-command.adapter';

@Module({
  imports: [PrismaModule],
  providers: [AbsoluteCommandAdapter],
  exports: [AbsoluteCommandAdapter],
})
export class AbsoluteCommandModule {}
