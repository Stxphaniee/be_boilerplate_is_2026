
import { Injectable } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationSourceModule,
} from '@PrismaClient';
import { NotificacionService } from './notificacion.service.js';

/**
 * HU16 - Notificaciones por cambios en partidos.
 *
 * Notifica al usuario cuando se modifica un partido.
 * Utiliza el servicio existente NotificacionService
 * para registrar las notificaciones.
 */
@Injectable()
export class MatchChangeService {
  constructor(
    private readonly notificacionService: NotificacionService,
  ) {}

  async notifyMatchChange(
    matchId: string,
    changeDescription: string,
    userId: string,
  ) {
    const notification = {
      destinatarioId: userId,
      categoria: NotificationCategory.CALENDARIO,
      moduloOrigen: NotificationSourceModule.CALENDARIO,
      titulo: 'Cambio en partido',
      mensaje: `El partido ${matchId} sufrió el siguiente cambio: ${changeDescription}`.slice(0, 500),
      referencia: matchId,
      eventoId: `cambio-partido:${matchId}:${changeDescription}`,
    };

    await this.notificacionService.crearAviso(notification);

    return notification;
  }
}
