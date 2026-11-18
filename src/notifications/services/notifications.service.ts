
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { MatchEventType, MatchState } from '@PrismaClient';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // HU2 - NOTIFICACIONES DE EQUIPOS
  // =====================================================

  buildTeamApproved(teamName: string) {
    return {
      title: 'Equipo aprobado',
      message: `La inscripción de ${teamName} ha sido aprobada.`,
    };
  }

  buildTeamRejected(teamName: string, reason: string) {
    return {
      title: 'Equipo rechazado',
      message: `La inscripción de ${teamName} fue rechazada. Motivo: ${reason}`,
    };
  }

  async notifyTeamApproved(captainId: string, teamName: string) {
    const notification = this.buildTeamApproved(teamName);

    return this.prisma.notification.create({
      data: {
        userId: captainId,
        title: notification.title,
        message: notification.message.slice(0, 500),
      },
    });
  }

  async notifyTeamRejected(
    captainId: string,
    teamName: string,
    reason: string,
  ) {
    const notification = this.buildTeamRejected(teamName, reason);

    return this.prisma.notification.create({
      data: {
        userId: captainId,
        title: notification.title,
        message: notification.message.slice(0, 500),
      },
    });
  }

  // =====================================================
  // HU7 - NOTIFICACIÓN DE RESULTADO FINAL
  // =====================================================

  buildMatchResultRegistered(
    homeTeamName: string,
    awayTeamName: string,
    homeGoals: number,
    awayGoals: number,
  ) {
    return {
      title: 'Resultado final registrado',
      message: `El partido ${homeTeamName} vs. ${awayTeamName} finalizó ${homeGoals}-${awayGoals}.`,
    };
  }

  async notifyMatchResult(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            captainId: true,
            players: {
              where: { userId: { not: null }, leftAt: null },
              select: { userId: true },
            },
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            captainId: true,
            players: {
              where: { userId: { not: null }, leftAt: null },
              select: { userId: true },
            },
          },
        },
        events: {
          where: { type: MatchEventType.GOL },
          select: {
            player: { select: { teamId: true } },
          },
        },
      },
    });

    if (!match || match.state !== MatchState.FINALIZADO) {
      return;
    }

    // Calcular marcador a partir de los goles registrados.
    const homeGoals = match.events.filter(
      (event) => event.player.teamId === match.homeTeamId,
    ).length;

    const awayGoals = match.events.filter(
      (event) => event.player.teamId === match.awayTeamId,
    ).length;

    const notification = this.buildMatchResultRegistered(
      match.homeTeam.name,
      match.awayTeam.name,
      homeGoals,
      awayGoals,
    );

    // Obtener destinatarios sin duplicados.
    const recipientIds = new Set<string>([
      match.homeTeam.captainId,
      match.awayTeam.captainId,
      ...match.homeTeam.players.flatMap((player) =>
        player.userId ? [player.userId] : [],
      ),
      ...match.awayTeam.players.flatMap((player) =>
        player.userId ? [player.userId] : [],
      ),
    ]);

    if (recipientIds.size === 0) return;

    await this.prisma.notification.createMany({
      data: [...recipientIds].map((userId) => ({
        userId,
        title: notification.title,
        message: notification.message.slice(0, 500),
      })),
    });
  }
}
