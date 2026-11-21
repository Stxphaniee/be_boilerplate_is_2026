
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/index.js';
import {
  MatchEventType,
  MatchState,
  NotificationCategory,
  NotificationSourceModule,
} from '../../generated/prisma/client.js';
import { NotificacionService } from './notificacion.service.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionService: NotificacionService,
  ) {}

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

  // =====================================================
  // HU17 - NOTIFICACIÓN DE PUBLICACIÓN DE JORNADA
  // =====================================================

  /**
   * Avisa a cada capitán con partido en la jornada y a cada árbitro asignado.
   * El eventoId es estable por jornada, así que reintentos o una segunda
   * llamada no duplican avisos (clave única eventoId + usuario).
   */
  async notifyRoundPublished(roundId: string): Promise<void> {
    const matches = await this.prisma.match.findMany({
      where: { roundId },
      orderBy: { startsAt: 'asc' },
      select: {
        refereeId: true,
        court: true,
        startsAt: true,
        homeTeam: { select: { name: true, captainId: true } },
        awayTeam: { select: { name: true, captainId: true } },
      },
    });

    if (matches.length === 0) return;

    const captainIds = new Set<string>();
    const matchesByReferee = new Map<string, string[]>();

    for (const match of matches) {
      captainIds.add(match.homeTeam.captainId);
      captainIds.add(match.awayTeam.captainId);

      const line = `${match.homeTeam.name} vs. ${match.awayTeam.name}, ${match.startsAt.toLocaleString('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'short', timeStyle: 'short' })}, cancha ${match.court}`;
      const lines = matchesByReferee.get(match.refereeId) ?? [];
      lines.push(line);
      matchesByReferee.set(match.refereeId, lines);
    }

    await this.notificacionService.crearAvisos(captainIds, {
      categoria: NotificationCategory.CALENDARIO,
      moduloOrigen: NotificationSourceModule.CALENDARIO,
      titulo: 'Jornada publicada',
      mensaje:
        'Se publicó una nueva jornada. Consulta el calendario oficial de tu equipo.',
      referencia: roundId,
      eventoId: `jornada-publicada:${roundId}`,
    });

    for (const [refereeId, lines] of matchesByReferee) {
      await this.notificacionService.crearAviso({
        destinatarioId: refereeId,
        categoria: NotificationCategory.CALENDARIO,
        moduloOrigen: NotificationSourceModule.CALENDARIO,
        titulo: 'Partido asignado',
        mensaje: `Se te asignó: ${lines.join(' | ')}`.slice(0, 500),
        referencia: roundId,
        eventoId: `partido-asignado:${roundId}`,
      });
    }
  }
}

