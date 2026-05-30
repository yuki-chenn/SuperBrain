import {
  Controller, Get, Patch, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGamesService } from './admin-games.service';

@Controller('admin/games')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminGamesController {
  constructor(private gamesService: AdminGamesService) {}

  @Get()
  async listGames(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.gamesService.list({
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  async getGame(@Param('id') id: string) {
    return this.gamesService.getDetail(id);
  }

  @Patch(':id')
  async updateGame(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
    @Body() body: { title?: string; subtitle?: string; description?: string; source?: string; coverUrl?: string },
  ) {
    return this.gamesService.update(id, body, admin);
  }

  @Post(':id/publish')
  async publishGame(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
  ) {
    return this.gamesService.publish(id, admin);
  }

  @Post(':id/archive')
  async archiveGame(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
  ) {
    return this.gamesService.archive(id, admin);
  }

  @Patch(':id/dimensions')
  async updateDimensions(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
    @Body() body: { dimensions: Array<{ key: string; label: string; value: number }> },
  ) {
    return this.gamesService.updateDimensions(id, body.dimensions, admin);
  }
}
