import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service.js';
import { NotificacionService } from './services/notificacion.service.js';
import {
  BandejaService,
  NotificacionesController,
} from './controllers/notificaciones.controller.js';

@Module({
  // HU20: bandeja centralizada y servicio de avisos.
  controllers: [NotificacionesController],
  providers: [NotificationsService, NotificacionService, BandejaService],
  exports: [NotificationsService, NotificacionService],
})
export class NotificationsModule {}