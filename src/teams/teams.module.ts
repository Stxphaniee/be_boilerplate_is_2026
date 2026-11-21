import { Module } from '@nestjs/common';

import { TeamsController } from '@Teams/controllers';
import { TeamsService } from '@Teams/services';
import {
  SeasonRepository,
  TeamRepository,
} from '@Teams/repositories';

import { PaymentsModule } from '../payments/payments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [
    TeamsController,
  ],
  providers: [
    TeamsService,
    TeamRepository,
    SeasonRepository,
  ],
  exports: [
    TeamsService,
    TeamRepository,
    SeasonRepository,
  ],
})
export class TeamsModule {}