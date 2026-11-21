import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/index.js';
import { RankingController } from './ranking.controller.js';
import { RankingService } from './ranking.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RankingController],
  providers: [RankingService],
})
export class RankingModule {}