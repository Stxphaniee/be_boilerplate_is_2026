import { Module } from '@nestjs/common';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller.js';
import { NotificationsService } from './services/notifications.service.js';
import { NotificacionService } from './services/notificacion.service.js';
import { NotificationPreferencesService } from './services/notification-preferences.service.js';

@Module({
  controllers: [NotificationPreferencesController],
  providers: [NotificationsService, NotificacionService, NotificationPreferencesService],
  exports: [NotificationsService, NotificacionService, NotificationPreferencesService],
})
export class NotificationsModule {}
