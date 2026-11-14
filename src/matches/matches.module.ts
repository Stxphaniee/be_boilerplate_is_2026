import { Module } from '@nestjs/common';

import { MatchesController } from '@Matches/controllers';
import { MatchesService } from '@Matches/services';
import {
  MatchRepository,
  RoundRepository,
} from '@Matches/repositories';

import { PrismaModule } from '@Prisma';
import { TeamsModule } from '../teams/index.js';

@Module({
  imports: [
    PrismaModule,
    TeamsModule,
  ],
  controllers: [
    MatchesController,
  ],
  providers: [
    MatchesService,
    MatchRepository,
    RoundRepository,
  ],
  exports: [
    MatchesService,
    MatchRepository,
  ],
})
export class MatchesModule {}