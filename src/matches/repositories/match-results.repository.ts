
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { MatchEventType, RoundState, Prisma } from '@PrismaClient';

export type MatchResultSummary = Prisma.MatchGetPayload<{
  include: {
    round: { select: { numero: true } };
    homeTeam: { select: { id: true; name: true } };
    awayTeam: { select: { id: true; name: true } };
    events: {
      where: { type: 'GOL' };
      include: {
        player: { select: { teamId: true } };
      };
    };
  };
}>;

export type MatchDetail = Prisma.MatchGetPayload<{
  include: {
    round: { select: { numero: true } };
    homeTeam: { select: { id: true; name: true } };
    awayTeam: { select: { id: true; name: true } };
    events: {
      include: {
        player: {
          select: { id: true; name: true; teamId: true };
        };
      };
      orderBy: [
        { minute: 'asc' },
        { createdAt: 'asc' },
      ];
    };
  };
}>;

@Injectable()
export class MatchResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // H8 - LISTADO DE RESULTADOS
  // =====================================================

  /**
   * Devuelve los partidos de jornadas PUBLICADAS,
   * ordenados por jornada y fecha de inicio.
   * El marcador se deriva de los eventos GOL.
   */
  findAllResults(): Promise<MatchResultSummary[]> {
    return this.prisma.match.findMany({
      where: {
        round: {
          state: RoundState.PUBLICADA,
        },
      },
      include: {
        round: {
          select: { numero: true },
        },
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
        events: {
          where: {
            type: MatchEventType.GOL,
          },
          include: {
            player: {
              select: { teamId: true },
            },
          },
        },
      },
      orderBy: [
        { round: { numero: 'asc' } },
        { startsAt: 'asc' },
      ],
    });
  }

  // =====================================================
  // H8 - DETALLE PÚBLICO DE PARTIDO
  // =====================================================

  /**
   * Devuelve únicamente partidos de jornadas PUBLICADAS.
   * Incluye todos los eventos ordenados cronológicamente.
   */
  findMatchDetail(matchId: string): Promise<MatchDetail | null> {
    return this.prisma.match.findFirst({
      where: {
        id: matchId,
        round: {
          state: RoundState.PUBLICADA,
        },
      },
      include: {
        round: {
          select: { numero: true },
        },
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
        events: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                teamId: true,
              },
            },
          },
          orderBy: [
            { minute: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });
  }
}
