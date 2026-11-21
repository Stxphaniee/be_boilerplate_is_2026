import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@Auth/decorators';
import { Role, type User } from '@PrismaClient';
import { PlayerStatsService } from './player-stats.service.js';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('jugadores')
export class PlayerStatsController {
  constructor(private readonly service: PlayerStatsService) {}

  @Get('mis-estadisticas')
  @Roles(Role.JUGADOR, Role.CAPITAN)
  getMyStats(@CurrentUser() user: User) {
    return this.service.getMyStats(user);
  }
}