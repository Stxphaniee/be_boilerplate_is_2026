import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchEventType,
  MatchState,
  NotificationCategory,
  NotificationSourceModule,
  type User,
} from '@PrismaClient';
import { PrismaService } from '@Prisma/services';

export interface CorrectMatchGoalInput {
  playerId: string;
  minute: number;
  assistPlayerId?: string;
}

export interface CorrectMatchInput {
  justificacion?: string;
  justification?: string;
  goles?: CorrectMatchGoalInput[];
  eliminarEventoIds?: string[];
}

@Injectable()
export class MatchCorrectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async correctMatchResult(matchId: string, admin: User, body: CorrectMatchInput) {
    const justification = (body.justificacion ?? body.justification ?? '').trim();
    if (!justification || justification.length > 300) {
      throw new BadRequestException(
        'La justificación es obligatoria y debe tener máximo 300 caracteres.',
      );
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        events: true,
      },
    });

    if (!match) {
      throw new NotFoundException('El partido solicitado no existe.');
    }

    if (match.state !== MatchState.FINALIZADO) {
      throw new ConflictException(
        'Solo se pueden corregir resultados de partidos en estado FINALIZADO.',
      );
    }

    const validPlayerIds = new Set([
      ...match.homeTeam.players.map((p) => p.id),
      ...match.awayTeam.players.map((p) => p.id),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      if (Array.isArray(body.eliminarEventoIds) && body.eliminarEventoIds.length > 0) {
        await tx.matchEvent.deleteMany({
          where: {
            matchId,
            OR: [
              { id: { in: body.eliminarEventoIds } },
              { relatedGoalId: { in: body.eliminarEventoIds } },
            ],
          },
        });
      }

      if (Array.isArray(body.goles)) {
        await tx.matchEvent.deleteMany({
          where: {
            matchId,
            type: { in: [MatchEventType.GOL, MatchEventType.ASISTENCIA] },
          },
        });

        for (const goal of body.goles) {
          if (!validPlayerIds.has(goal.playerId)) {
            throw new BadRequestException(
              `El jugador ${goal.playerId} no pertenece a los equipos del partido.`,
            );
          }

          const createdGoal = await tx.matchEvent.create({
            data: {
              matchId,
              playerId: goal.playerId,
              type: MatchEventType.GOL,
              minute: Math.max(0, Math.min(130, Number(goal.minute) || 1)),
            },
          });

          if (goal.assistPlayerId) {
            if (!validPlayerIds.has(goal.assistPlayerId)) {
              throw new BadRequestException(
                `El asistente ${goal.assistPlayerId} no pertenece a los equipos del partido.`,
              );
            }
            await tx.matchEvent.create({
              data: {
                matchId,
                playerId: goal.assistPlayerId,
                type: MatchEventType.ASISTENCIA,
                minute: createdGoal.minute,
                relatedGoalId: createdGoal.id,
              },
            });
          }
        }
      }

      const updatedEvents = await tx.matchEvent.findMany({
        where: { matchId },
        include: { player: true },
        orderBy: { minute: 'asc' },
      });

      const homeGoals = updatedEvents.filter(
        (e) => e.type === MatchEventType.GOL && e.player.teamId === match.homeTeamId,
      ).length;
      const awayGoals = updatedEvents.filter(
        (e) => e.type === MatchEventType.GOL && e.player.teamId === match.awayTeamId,
      ).length;

      return { homeGoals, awayGoals, eventsCount: updatedEvents.length };
    });

    const recipientIds = new Set<string>([
      match.homeTeam.captainId,
      match.awayTeam.captainId,
    ]);
    for (const p of [...match.homeTeam.players, ...match.awayTeam.players]) {
      if (p.userId) recipientIds.add(p.userId);
    }

    const eventId = `correccion-resultado:${matchId}:${Date.now()}`;
    for (const userId of recipientIds) {
      await this.prisma.notification
        .create({
          data: {
            userId,
            title: 'Resultado oficial corregido',
            message: `${match.homeTeam.name} ${result.homeGoals} - ${result.awayGoals} ${match.awayTeam.name}. Motivo: ${justification}`.slice(0, 500),
            category: NotificationCategory.RESULTADOS,
            sourceModule: NotificationSourceModule.RESULTADOS,
            reference: matchId,
            eventId,
            isCritical: false,
          },
        })
        .catch(() => null);
    }

    return {
      matchId,
      marcador: { local: result.homeGoals, visitante: result.awayGoals },
      auditoria: {
        corregidoPor: admin.id,
        justificacion: justification,
        fecha: new Date().toISOString(),
      },
    };
  }
}