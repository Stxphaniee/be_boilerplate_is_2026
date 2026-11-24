import { ForbiddenException, Injectable } from '@nestjs/common';
import { MatchEventType, MatchState, TeamState } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStandings() {
    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    if (!season) {
      return { temporada: null, tabla: [] };
    }

    const teams = await this.prisma.team.findMany({
      where: { seasonId: season.id, status: TeamState.APROBADO },
      select: { id: true, name: true, status: true },
    });

    const matches = await this.prisma.match.findMany({
      where: {
        state: MatchState.FINALIZADO,
        round: { seasonId: season.id },
      },
      include: {
        events: {
          where: { type: MatchEventType.GOL },
          include: { player: { select: { teamId: true } } },
        },
      },
    });

    const statsMap = new Map(
      teams.map((t) => [
        t.id,
        {
          equipoId: t.id,
          equipo: t.name,
          estado: t.status,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          gf: 0,
          gc: 0,
          dg: 0,
          pts: 0,
        },
      ]),
    );

    for (const match of matches) {
      const home = statsMap.get(match.homeTeamId);
      const away = statsMap.get(match.awayTeamId);
      if (!home || !away) continue;

      let homeGoals = 0;
      let awayGoals = 0;
      for (const ev of match.events) {
        if (ev.player.teamId === match.homeTeamId) homeGoals++;
        else if (ev.player.teamId === match.awayTeamId) awayGoals++;
      }

      home.pj++;
      away.pj++;
      home.gf += homeGoals;
      home.gc += awayGoals;
      away.gf += awayGoals;
      away.gc += homeGoals;

      if (homeGoals > awayGoals) {
        home.pg++;
        home.pts += 3;
        away.pp++;
      } else if (awayGoals > homeGoals) {
        away.pg++;
        away.pts += 3;
        home.pp++;
      } else {
        home.pe++;
        away.pe++;
        home.pts += 1;
        away.pts += 1;
      }
    }

    const tabla = Array.from(statsMap.values())
      .map((row) => ({ ...row, dg: row.gf - row.gc }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.equipo.localeCompare(b.equipo, 'es');
      })
      .map((row, idx) => ({ posicion: idx + 1, ...row }));

    return {
      temporada: season.name,
      actualizadoEn: new Date().toISOString(),
      tabla,
    };
  }

  rejectManualEdit(): never {
    throw new ForbiddenException(
      'No está permitido editar manualmente los puntos de la tabla de posiciones.',
    );
  }
}