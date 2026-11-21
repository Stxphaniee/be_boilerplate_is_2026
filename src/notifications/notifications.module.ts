import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service.js';
import { NotificacionService } from './services/notificacion.service.js';
import { MatchChangeService } from './services/match-change.service.js';
import { MatchChangeController } from './controllers/match-change.controller.js';

@Module({
  controllers: [MatchChangeController],
  providers: [NotificationsService, NotificacionService, MatchChangeService],
  exports: [NotificationsService, NotificacionService],
})
export class NotificationsModule {}