import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchEventType, MatchState, type User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/services/index.js';

@Injectable()
export class PlayerStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStats(user: User) {
    const player = await this.prisma.player.findUnique({
      where: { userId: user.id },
      include: {
        team: { include: { season: true } },
      },
    });

    if (!player) {
      throw new NotFoundException(
        'No tienes una ficha de jugador vinculada en la temporada activa.',
      );
    }

    const [partidosJugados, events] = await Promise.all([
      this.prisma.matchParticipation.count({
        where: {
          playerId: player.id,
          participated: true,
          match: { state: MatchState.FINALIZADO },
        },
      }),
      this.prisma.matchEvent.findMany({
        where: {
          playerId: player.id,
          match: { state: MatchState.FINALIZADO },
        },
        select: { type: true },
      }),
    ]);

    let goles = 0;
    let asistencias = 0;
    let tarjetasAmarillas = 0;
    let tarjetasRojas = 0;

    for (const ev of events) {
      if (ev.type === MatchEventType.GOL) goles++;
      else if (ev.type === MatchEventType.ASISTENCIA) asistencias++;
      else if (ev.type === MatchEventType.AMARILLA) tarjetasAmarillas++;
      else if (ev.type === MatchEventType.ROJA) tarjetasRojas++;
    }

    return {
      jugadorNombre: player.name,
      equipoNombre: player.team.name,
      posicion: player.position,
      dorsal: player.jerseyNumber,
      temporada: player.team.season.name,
      partidosJugados,
      goles,
      asistencias,
      tarjetasAmarillas,
      tarjetasRojas,
    };
  }
}