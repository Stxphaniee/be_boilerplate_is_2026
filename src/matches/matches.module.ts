import { Module } from '@nestjs/common';

import {
  MatchesController,
  MatchLiveController,
  MatchResultsController,
 feature/HU11-Tabla-Posiciones

  MatchCorrectionController,
 develop
  StandingsController,
} from '@Matches/controllers';

import {
  MatchesService,
  MatchLiveService,
  MatchResultsService,
 feature/HU11-Tabla-Posiciones

  MatchCorrectionService,
develop
  StandingsService,
} from '@Matches/services';

import {
  MatchRepository,
  RoundRepository,
  MatchLiveRepository,
  MatchResultsRepository,
} from '@Matches/repositories';

import { PrismaModule } from '@Prisma';
import { TeamsModule } from '../teams/index.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

import {
  MatchRefereePanelController,
} from './controllers/match-referee-panel.controller.js';

import {
  MatchRefereePanelService,
} from './services/match-referee-panel.service.js';

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
 feature/HU11-Tabla-Posiciones

    MatchRefereePanelController,
    MatchCorrectionController,
 develop
    StandingsController,
  ],

  providers: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
 feature/HU11-Tabla-Posiciones

    MatchRefereePanelService,
    MatchCorrectionService,
 develop
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
 feature/HU11-Tabla-Posiciones

    MatchCorrectionService,
 develop
    StandingsService,
    MatchRepository,
    MatchLiveRepository,
    MatchResultsRepository,
  ],
})
export class MatchesModule {}