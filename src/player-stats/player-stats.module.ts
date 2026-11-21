import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PlayerStatsController } from './player-stats.controller.js';
import { PlayerStatsService } from './player-stats.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PlayerStatsController],
  providers: [PlayerStatsService],
})
export class PlayerStatsModule {}