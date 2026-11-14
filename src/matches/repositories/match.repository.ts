import { Injectable } from '@nestjs/common';

import { PrismaService } from '@Prisma/services';

import { Court, MatchState } from '@PrismaClient';
import type { Match } from '@PrismaClient';

export interface CreateMatchData {
  roundId: string;
  homeTeamId: string;
  awayTeamId: string;
  refereeId: string;
  court: Court;
  startsAt: Date;
  endsAt: Date;
}

@Injectable()
export class MatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMatchData): Promise<Match> {
    return this.prisma.match.create({ data });
  }

  findById(id: string): Promise<Match | null> {
    return this.prisma.match.findUnique({
      where: { id },
    });
  }

  findByRound(roundId: string): Promise<Match[]> {
    return this.prisma.match.findMany({
      where: { roundId },
      orderBy: { startsAt: 'asc' },
    });
  }

  // Verifica si la cancha está ocupada.
  hasCourtOverlap(
    court: Court,
    startsAt: Date,
    endsAt: Date,
    excludeMatchId?: string,
  ): Promise<boolean> {
    return this.prisma.match
      .count({
        where: {
          court,
          state: { not: MatchState.CANCELADO },
          id: excludeMatchId ? { not: excludeMatchId } : undefined,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      })
      .then((count) => count > 0);
  }

  // Verifica si alguno de los equipos tiene otro partido.
  hasTeamOverlap(
    homeTeamId: string,
    awayTeamId: string,
    startsAt: Date,
    endsAt: Date,
    excludeMatchId?: string,
  ): Promise<boolean> {
    return this.prisma.match
      .count({
        where: {
          state: { not: MatchState.CANCELADO },
          id: excludeMatchId ? { not: excludeMatchId } : undefined,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          OR: [
            { homeTeamId: { in: [homeTeamId, awayTeamId] } },
            { awayTeamId: { in: [homeTeamId, awayTeamId] } },
          ],
        },
      })
      .then((count) => count > 0);
  }

  // Evita enfrentamientos duplicados en la misma jornada.
  hasDuplicateFixture(
    roundId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<boolean> {
    return this.prisma.match
      .count({
        where: {
          roundId,
          state: { not: MatchState.CANCELADO },
          OR: [
            { homeTeamId, awayTeamId },
            {
              homeTeamId: awayTeamId,
              awayTeamId: homeTeamId,
            },
          ],
        },
      })
      .then((count) => count > 0);
  }

  // Comprueba si la jornada tiene equipos suspendidos.
  hasSuspendedTeam(roundId: string): Promise<boolean> {
    return this.prisma.match
      .count({
        where: {
          roundId,
          state: { not: MatchState.CANCELADO },
          OR: [
            { homeTeam: { status: 'SUSPENDIDO' } },
            { awayTeam: { status: 'SUSPENDIDO' } },
          ],
        },
      })
      .then((count) => count > 0);
  }
}