import { Module } from '@nestjs/common';
import { AbsoluteCommandController } from './absolute-command.controller';
import { AbsoluteCommandAdminController } from './absolute-command-admin.controller';
import { AbsoluteCommandService } from './absolute-command.service';
import { AbsoluteCommandAdminService } from './absolute-command-admin.service';
import { AbsoluteCommandAdapter } from './absolute-command.adapter';
import { GamesModule } from '../games.module';
import { LeaderboardsModule } from '../../leaderboards/leaderboards.module';
import { PrismaModule } from '../../database/prisma.module';
import { AdminModule } from '../../admin/admin.module';

@Module({
  imports: [GamesModule, LeaderboardsModule, PrismaModule, AdminModule],
  controllers: [AbsoluteCommandController, AbsoluteCommandAdminController],
  providers: [AbsoluteCommandService, AbsoluteCommandAdminService, AbsoluteCommandAdapter],
  exports: [AbsoluteCommandService, AbsoluteCommandAdminService, AbsoluteCommandAdapter],
})
export class AbsoluteCommandModule {}
