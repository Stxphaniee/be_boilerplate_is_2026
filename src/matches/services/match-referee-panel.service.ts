import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  MatchEventType,
  Role,
  RoundState,
  type User,
} from '../../generated/prisma/client.js';

import { MatchLiveRepository } from '../repositories/index.js';

@Injectable()
export class MatchRefereePanelService {
  constructor(
    private readonly matchLiveRepository: MatchLiveRepository,
  ) {}

  async findPanel(user: User, matchId: string) {
    if (user.role !== Role.ARBITRO || !user.isActive) {
      throw new ForbiddenException(
        'Acceso exclusivo para árbitros activos.',
      );
    }

    const match =
      await this.matchLiveRepository.findRefereePanel(matchId);

    if (!match) {
      throw new NotFoundException(
        'El partido solicitado no existe.',
      );
    }

    if (match.refereeId !== user.id) {
      throw new ForbiddenException(
        'No estás asignado como árbitro de este partido.',
      );
    }

    if (match.round.state !== RoundState.PUBLICADA) {
      throw new NotFoundException(
        'La jornada del partido todavía no está publicada.',
      );
    }

    const goals = match.events.filter(
      (event) => event.type === MatchEventType.GOL,
    );

    const homeGoals = goals.filter(
      (event) => event.player.teamId === match.homeTeamId,
    ).length;

    const awayGoals = goals.filter(
      (event) => event.player.teamId === match.awayTeamId,
    ).length;

    const participationMap = new Map(
      match.participations.map((participation) => [
        participation.playerId,
        participation.participated,
      ]),
    );

    const players = [
      ...match.homeTeam.players,
      ...match.awayTeam.players,
    ].map((player) => ({
      id: player.id,
      nombre: player.name,
      equipoId: player.teamId,
      dorsal: player.jerseyNumber,
      posicion: player.position,
      activo: player.leftAt === null,
      participo: participationMap.get(player.id) ?? false,
    }));

    return {
      id: match.id,
      jornada: match.round.numero,
      estado: match.state,
      cancha: match.court,

      fechaHoraInicio: match.startsAt.toISOString(),
      fechaHoraFin: match.endsAt.toISOString(),

      inicioReal:
        match.actualStartedAt?.toISOString() ?? null,

      finReal:
        match.actualFinishedAt?.toISOString() ?? null,

      servidorAhora: new Date().toISOString(),

      equipoLocal: {
        id: match.homeTeam.id,
        nombre: match.homeTeam.name,
        goles: homeGoals,
      },

      equipoVisitante: {
        id: match.awayTeam.id,
        nombre: match.awayTeam.name,
        goles: awayGoals,
      },

      jugadores: players,

      eventos: match.events.map((event) => ({
        id: event.id,
        jugadorId: event.playerId,
        jugador: event.player.name,
        equipoId: event.player.teamId,
        tipo: event.type,
        minuto: event.minute,
        golRelacionadoId: event.relatedGoalId,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }
}