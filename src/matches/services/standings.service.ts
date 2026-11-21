import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { MatchEventType, MatchState, TeamState } from '@PrismaClient';
import {
  StandingsResponseDto,
  TablaPosicionesItemDto,
} from '../dto/standings.dto.js';

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateStandings(): Promise<StandingsResponseDto> {
    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
    });

    if (!season) {
      throw new NotFoundException('No hay una temporada activa configurada.');
    }

    // Solo equipos en estado APROBADO de la temporada activa
    const teams = await this.prisma.team.findMany({
      where: {
        seasonId: season.id,
        status: TeamState.APROBADO,
      },
      include: {
        players: {
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Solo partidos FINALIZADOS de la temporada activa
    const matches = await this.prisma.match.findMany({
      where: {
        round: { seasonId: season.id },
        state: MatchState.FINALIZADO,
      },
      include: {
        events: {
          where: { type: MatchEventType.GOL },
          select: {
            playerId: true,
          },
        },
      },
    });

    // Diccionario de métricas por equipo inicializadas en 0
    const statsMap = new Map<
      string,
      {
        equipoId: string;
        nombre: string;
        shortName: string;
        pj: number;
        pg: number;
        pe: number;
        pp: number;
        gf: number;
        gc: number;
      }
    >();

    const teamPlayersMap = new Map<string, Set<string>>();

    for (const team of teams) {
      statsMap.set(team.id, {
        equipoId: team.id,
        nombre: team.name,
        shortName: team.shortName,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
      });

      teamPlayersMap.set(
        team.id,
        new Set(team.players.map((p) => p.id)),
      );
    }

    // Calcular goles y resultados de cada partido finalizado
    for (const match of matches) {
      const homeStats = statsMap.get(match.homeTeamId);
      const awayStats = statsMap.get(match.awayTeamId);

      if (!homeStats || !awayStats) continue;

      const homePlayers = teamPlayersMap.get(match.homeTeamId);

      let homeGoals = 0;
      let awayGoals = 0;

      for (const ev of match.events) {
        if (homePlayers?.has(ev.playerId)) {
          homeGoals++;
        } else {
          awayGoals++;
        }
      }

      homeStats.pj++;
      awayStats.pj++;

      homeStats.gf += homeGoals;
      homeStats.gc += awayGoals;

      awayStats.gf += awayGoals;
      awayStats.gc += homeGoals;

      if (homeGoals > awayGoals) {
        homeStats.pg++;
        awayStats.pp++;
      } else if (homeGoals < awayGoals) {
        awayStats.pg++;
        homeStats.pp++;
      } else {
        homeStats.pe++;
        awayStats.pe++;
      }
    }

    const items: Array<Omit<TablaPosicionesItemDto, 'posicion'>> = Array.from(
      statsMap.values(),
    ).map((st) => {
      const dg = st.gf - st.gc;
      const pts = st.pg * 3 + st.pe * 1;
      return {
        equipoId: st.equipoId,
        nombre: st.nombre,
        shortName: st.shortName,
        pj: st.pj,
        pg: st.pg,
        pe: st.pe,
        pp: st.pp,
        gf: st.gf,
        gc: st.gc,
        dg,
        pts,
      };
    });

    // Criterios de desempate:
    // 1° Mayor cantidad de Puntos
    // 2° Mayor Diferencia de Goles
    // 3° Mayor cantidad de Goles a Favor
    // 4° Orden alfabético por nombre
    items.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });

    const posiciones: TablaPosicionesItemDto[] = items.map((item, index) => ({
      posicion: index + 1,
      ...item,
    }));

    const lider = posiciones.length > 0 ? posiciones[0].nombre : 'Sin equipos';

    return {
      temporada: season.name,
      equiposAprobados: teams.length,
      partidosFinalizados: matches.length,
      lider,
      posiciones,
    };
  }

  rejectManualUpdate(): never {
    throw new ForbiddenException(
      'No se permite alterar o manipular manualmente los puntos o valores de la tabla omitiendo los resultados oficiales (403).',
    );
  }
}
