import { Module } from '@nestjs/common';

import {
  MatchesController,
  MatchLiveController,
  MatchResultsController,
  MatchCorrectionController,
  StandingsController,
} from './controllers/index.js';

import {
  MatchesService,
  MatchLiveService,
  MatchResultsService,
  MatchCorrectionService,
  StandingsService,
} from './services/index.js';

import {
  MatchRepository,
  RoundRepository,
  MatchLiveRepository,
  MatchResultsRepository,
} from './repositories/index.js';

import { PrismaModule } from '../prisma/index.js';
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
    MatchRefereePanelController,
    MatchCorrectionController,
    StandingsController,
  ],

  providers: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
    MatchRefereePanelService,
    MatchCorrectionService,
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
    MatchCorrectionService,
    StandingsService,
    MatchRepository,
    MatchLiveRepository,
    MatchResultsRepository,
  ],
})
export class MatchesModule {}