import { Module } from '@nestjs/common';

import { NotificationsService } from './services/notifications.service.js';
import { NotificacionService } from './services/notificacion.service.js';

import { MatchChangeService } from './services/match-change.service.js';
import { MatchChangeController } from './controllers/match-change.controller.js';

import {
  BandejaService,
  NotificacionesController,
} from './controllers/notificaciones.controller.js';

import { NotificationPreferencesController } from './controllers/notification-preferences.controller.js';
import { NotificationPreferencesService } from './services/notification-preferences.service.js';

@Module({
  controllers: [
    MatchChangeController,
    NotificacionesController,
    NotificationPreferencesController,
  ],
  providers: [
    NotificationsService,
    NotificacionService,
    MatchChangeService,
    BandejaService,
    NotificationPreferencesService,
  ],
  exports: [
    NotificationsService,
    NotificacionService,
    NotificationPreferencesService,
  ],
})
export class NotificationsModule {}
