import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service.js';
import { NotificacionService } from './services/notificacion.service.js';

@Module({
  providers: [NotificationsService, NotificacionService],
  exports: [NotificationsService, NotificacionService],
})
export class NotificationsModule {}