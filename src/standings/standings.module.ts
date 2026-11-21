import { Module } from '@nestjs/common';
import { PrismaModule } from '@Prisma';
import { StandingsController } from './standings.controller.js';
import { StandingsService } from './standings.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class StandingsModule {}