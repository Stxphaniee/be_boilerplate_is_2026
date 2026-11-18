
import { Module } from '@nestjs/common';

import {
  MatchesController,
  MatchLiveController,
} from '@Matches/controllers';

import {
  MatchLiveService,
  MatchesService,
} from '@Matches/services';

import {
  MatchLiveRepository,
  MatchRepository,
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
  ],
  providers: [
    MatchesService,
    MatchLiveService,
    MatchRepository,
    MatchLiveRepository,
    RoundRepository,
  ],
  exports: [
    MatchesService,
    MatchLiveService,
    MatchRepository,
    MatchLiveRepository,
  ],
})
export class MatchesModule {}
