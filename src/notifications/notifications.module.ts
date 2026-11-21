import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service.js';
import { NotificacionService } from './services/notificacion.service.js';
import { MatchChangeService } from './services/match-change.service.js';
import { MatchChangeController } from './controllers/match-change.controller.js';
import {
  BandejaService,
  NotificacionesController,
} from './controllers/notificaciones.controller.js';

@Module({
  controllers: [MatchChangeController, NotificacionesController],
  providers: [NotificationsService, NotificacionService, MatchChangeService, BandejaService],
  exports: [NotificationsService, NotificacionService],
})
export class NotificationsModule {}
