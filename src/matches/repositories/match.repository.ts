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

export interface UpdateMatchData {
  startsAt?: Date;
  endsAt?: Date;
  court?: Court;
  state?: MatchState;
  suspensionReason?: string | null;
}

@Injectable()
export class MatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMatchData): Promise<Match> {
    return this.prisma.match.create({ data });
  }

  findById(id: string): Promise<Match | null> {
    return this.prisma.match.findUnique({ where: { id } });
  }

  findByRound(roundId: string): Promise<Match[]> {
    return this.prisma.match.findMany({
      where: { roundId },
      orderBy: { startsAt: 'asc' },
    });
  }

  update(id: string, data: UpdateMatchData): Promise<Match> {
    return this.prisma.match.update({
      where: { id },
      data: {
        ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
        ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
        ...(data.court !== undefined && { court: data.court }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.suspensionReason !== undefined && {
          suspensionReason: data.suspensionReason,
        }),
      },
    });
  }

  // =====================================================
  // VALIDACIONES DE TRASLAPE
  // =====================================================

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
      .then((c) => c > 0);
  }

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
      .then((c) => c > 0);
  }

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
            { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
          ],
        },
      })
      .then((c) => c > 0);
  }

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
      .then((c) => c > 0);
  }
}