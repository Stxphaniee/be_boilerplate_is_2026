
import { Module } from '@nestjs/common';

import {
  MatchesController,
  MatchLiveController,
  MatchResultsController,
  StandingsController,
} from '@Matches/controllers';

import {
  MatchLiveService,
  MatchesService,
  MatchResultsService,
  StandingsService,
} from '@Matches/services';

import {
  MatchLiveRepository,
  MatchRepository,
  MatchResultsRepository,
  RoundRepository,
} from '@Matches/repositories';

import { PrismaModule } from '@Prisma';
import { TeamsModule } from '../teams/index.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    PrismaModule,
    TeamsModule,
    NotificationsModule,
  ],
  controllers: [
    MatchesController,
    MatchLiveController,
    MatchResultsController,
    StandingsController,
  ],
  providers: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
    StandingsService,
    MatchRepository,
    MatchLiveRepository,
    MatchResultsRepository,
    RoundRepository,
  ],
  exports: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
    StandingsService,
    MatchRepository,
    MatchLiveRepository,
    MatchResultsRepository,
  ],
})
export class MatchesModule {}
