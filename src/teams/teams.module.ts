import { Module } from '@nestjs/common';

import { TeamsController } from './controllers/index.js';
import { TeamsService } from './services/index.js';
import {
  SeasonRepository,
  TeamRepository,
} from './repositories/index.js';

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