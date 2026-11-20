import { Module } from '@nestjs/common';

import {
  MatchesController,
  MatchLiveController,
  MatchResultsController,
} from '@Matches/controllers';

import {
  MatchesService,
  MatchLiveService,
  MatchResultsService,
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
    MatchRefereePanelController,
  ],

  providers: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
    MatchRefereePanelService,
    MatchRepository,
    MatchLiveRepository,
    MatchResultsRepository,
    RoundRepository,
  ],

  exports: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
    MatchRepository,
    MatchLiveRepository,
    MatchResultsRepository,
  ],
})
export class MatchesModule {}