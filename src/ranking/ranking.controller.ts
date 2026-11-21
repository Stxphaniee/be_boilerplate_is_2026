import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/index.js';
import { Role } from '../generated/prisma/client.js';
import { RankingService } from './ranking.service.js';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('estadisticas')
export class RankingController {
  constructor(private readonly service: RankingService) {}

  @Get('ranking')
  @Roles(Role.ORGANIZADOR)
  getRanking(
    @Query('categoria') categoria?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRanking(categoria, limit);
  }
}