import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminRolesController } from './admin-roles.controller';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminGamesController } from './admin-games.controller';
import { AdminGamesService } from './admin-games.service';
import { AdminPuzzlesController } from './admin-puzzles.controller';
import { AdminPuzzlesService } from './admin-puzzles.service';
import { AdminReviewTasksController } from './admin-review-tasks.controller';
import { AdminScoreRecordsController } from './admin-score-records.controller';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, LeaderboardsModule],
  controllers: [
    AdminUsersController, AdminRolesController, AdminPermissionsController,
    AdminAuditController, AdminGamesController, AdminPuzzlesController,
    AdminReviewTasksController, AdminScoreRecordsController,
  ],
  providers: [AuditService, AdminUsersService, AdminGamesService, AdminPuzzlesService],
  exports: [AuditService],
})
export class AdminModule {}
