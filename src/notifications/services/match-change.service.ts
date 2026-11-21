import { Injectable } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';

/**
 * Service responsible for creating a notification when a match changes.
 * This is a minimal implementation to satisfy story HU16. It receives the
 * match identifier and a description of the change (e.g. "score updated",
 * "status changed"). The service delegates to the existing NotificacionService
 * to create an idempotent notification.
 */
@Injectable()
export class MatchChangeService {
  constructor(private readonly notificacionService: NotificacionService) {}

  async notifyMatchChange(matchId: number, changeDescription: string, userId: number) {
    // Build a simple notification payload.
    const notification = {
      userId,
      eventId: `match-${matchId}-${Date.now()}`,
      category: 'CAMBIO_PARTIDO', // Enum defined in H20 schema.
      sourceModule: 'PARTIDO',
      reference: matchId.toString(),
      isCritical: false,
      message: `El partido ${matchId} sufrió el siguiente cambio: ${changeDescription}`,
    };
    // Use the existing service that guarantees idempotency.
    await this.notificacionService.createNotification(notification);
    return notification;
  }
}
