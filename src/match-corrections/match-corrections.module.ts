import { Module } from '@nestjs/common';
import { PrismaModule } from '@Prisma';
import { MatchCorrectionsController } from './match-corrections.controller.js';
import { MatchCorrectionsService } from './match-corrections.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [MatchCorrectionsController],
  providers: [MatchCorrectionsService],
})
export class MatchCorrectionsModule {}