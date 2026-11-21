import { BadRequestException, Injectable } from '@nestjs/common';
import { MatchEventType, MatchState, TeamState } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';

const CATEGORY_MAP: Record<string, MatchEventType> = {
  goles: MatchEventType.GOL,
  asistencias: MatchEventType.ASISTENCIA,
  amarillas: MatchEventType.AMARILLA,
  rojas: MatchEventType.ROJA,
};

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRanking(categoriaRaw?: string, limitRaw?: string) {
    const key = (categoriaRaw ?? 'goles').toLowerCase();
    const eventType = CATEGORY_MAP[key];
    if (!eventType) {
      throw new BadRequestException(
        'Categoría inválida. Usa: goles, asistencias, amarillas o rojas.',
      );
    }

    const parsedLimit = Number(limitRaw ?? 10);
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 10)
        : 10;

    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    if (!season) return { categoria: key, items: [] };

    const players = await this.prisma.player.findMany({
      where: {
        team: { seasonId: season.id, status: TeamState.APROBADO },
      },
      include: {
        team: { select: { name: true } },
        matchEvents: {
          where: {
            type: eventType,
            match: { state: MatchState.FINALIZADO, round: { seasonId: season.id } },
          },
          select: { id: true },
        },
        matchParticipations: {
          where: {
            participated: true,
            match: { state: MatchState.FINALIZADO, round: { seasonId: season.id } },
          },
          select: { id: true },
        },
      },
    });

    const items = players
      .map((p) => ({
        jugadorId: p.id,
        jugadorNombre: p.name,
        equipoNombre: p.team.name,
        dorsal: p.jerseyNumber,
        partidosJugados: p.matchParticipations.length,
        valor: p.matchEvents.length,
      }))
      .filter((row) => row.valor > 0)
      .sort((a, b) => {
        if (b.valor !== a.valor) return b.valor - a.valor;
        if (a.partidosJugados !== b.partidosJugados) {
          return a.partidosJugados - b.partidosJugados;
        }
        return a.jugadorNombre.localeCompare(b.jugadorNombre, 'es');
      })
      .slice(0, limit)
      .map((row, idx) => ({ posicion: idx + 1, ...row }));

    return { categoria: key, items };
  }
}