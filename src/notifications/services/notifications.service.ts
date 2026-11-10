
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // HU2 - Construir notificación de aprobación
  buildTeamApproved(teamName: string) {
    return {
      title: 'Equipo aprobado',
      message: `La inscripción de ${teamName} ha sido aprobada.`,
    };
  }

  // HU2 - Construir notificación de rechazo
  buildTeamRejected(teamName: string, reason: string) {
    return {
      title: 'Equipo rechazado',
      message: `La inscripción de ${teamName} fue rechazada. Motivo: ${reason}`,
    };
  }

  // Guardar notificación de aprobación
  async notifyTeamApproved(
    captainId: string,
    teamName: string,
  ) {
    const notification = this.buildTeamApproved(teamName);

    return this.prisma.notification.create({
      data: {
        userId: captainId,
        title: notification.title,
        message: notification.message.slice(0, 500),
      },
    });
  }

  // Guardar notificación de rechazo
  async notifyTeamRejected(
    captainId: string,
    teamName: string,
    reason: string,
  ) {
    const notification = this.buildTeamRejected(
      teamName,
      reason,
    );

    return this.prisma.notification.create({
      data: {
        userId: captainId,
        title: notification.title,
        message: notification.message.slice(0, 500),
      },
    });
  }
}
