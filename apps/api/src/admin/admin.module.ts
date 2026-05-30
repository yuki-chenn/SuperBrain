import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuditService } from './audit.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGamesController } from './admin-games.controller';
import { AdminGamesService } from './admin-games.service';
import { AdminLeaderboardsController } from './admin-leaderboards.controller';
import { AdminAttemptsController } from './admin-attempts.controller';
import { AdminAuditController } from './admin-audit.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminGamesController,
    AdminLeaderboardsController,
    AdminAttemptsController,
    AdminAuditController,
  ],
  providers: [
    AuditService,
    AdminUsersService,
    AdminGamesService,
  ],
  exports: [AuditService],
})
export class AdminModule {}
