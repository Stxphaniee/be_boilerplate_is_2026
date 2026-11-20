import { Module } from '@nestjs/common';

import {
  MatchesController,
  MatchLiveController,
  MatchResultsController,
  StandingsController,
} from '@Matches/controllers';

import {
  MatchesService,
  MatchLiveService,
  MatchResultsService,
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
<<<<<<< HEAD
    StandingsController,
=======
    MatchRefereePanelController,
>>>>>>> 535ea73 (:building_construction:[UPDATE]Integra controlador y servicio del panel del arbitro en MatchesModule)
  ],

  providers: [
    MatchesService,
    MatchLiveService,
    MatchResultsService,
<<<<<<< HEAD
    StandingsService,
=======
    MatchRefereePanelService,
>>>>>>> 535ea73 (:building_construction:[UPDATE]Integra controlador y servicio del panel del arbitro en MatchesModule)
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