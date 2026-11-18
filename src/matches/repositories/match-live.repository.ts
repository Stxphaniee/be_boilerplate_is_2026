
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  MatchEventType,
  MatchState,
  RoundState,
  Prisma,
} from '@PrismaClient';

export interface CreateMatchEventData {
  matchId: string;
  playerId: string;
  type: MatchEventType;
  minute: number;
  relatedGoalId?: string | null;
}

export interface MatchParticipationData {
  jugadorId: string;
  participo: boolean;
}

export type MatchLiveDetail = Prisma.MatchGetPayload<{
  include: {
    round: { select: { state: true; numero: true } };
    homeTeam: { select: { id: true; name: true } };
    awayTeam: { select: { id: true; name: true } };
  };
}>;

export type RefereeMatchData = Prisma.MatchGetPayload<{
  include: {
    round: { select: { numero: true } };
    homeTeam: { select: { id: true; name: true } };
    awayTeam: { select: { id: true; name: true } };
  };
}>;

export type MatchEventWithPlayer = Prisma.MatchEventGetPayload<{
  include: {
    player: { select: { id: true; name: true; teamId: true } };
  };
}>;

export type MatchScoreboardData = Prisma.MatchGetPayload<{
  include: {
    round: { select: { numero: true } };
    homeTeam: { select: { id: true; name: true } };
    awayTeam: { select: { id: true; name: true } };
    events: {
      where: { type: 'GOL' };
      include: { player: { select: { teamId: true } } };
    };
  };
}>;

@Injectable()
export class MatchLiveRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // CONSULTA DEL PARTIDO
  // =====================================================

  findMatchForLive(matchId: string): Promise<MatchLiveDetail | null> {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: { select: { state: true, numero: true } },
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    });
  }

  // =====================================================
  // PARTIDOS ASIGNADOS AL ÁRBITRO
  // =====================================================

  findRefereeMatches(refereeId: string): Promise<RefereeMatchData[]> {
    return this.prisma.match.findMany({
      where: {
        refereeId,
        round: { state: RoundState.PUBLICADA },
      },
      include: {
        round: { select: { numero: true } },
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // =====================================================
  // ACTUALIZACIÓN DEL ESTADO
  // =====================================================

  async updateStateIfCurrent(
    matchId: string,
    currentState: MatchState,
    nextState: MatchState,
  ): Promise<boolean> {
    const result = await this.prisma.match.updateMany({
      where: { id: matchId, state: currentState },
      data: { state: nextState },
    });

    return result.count === 1;
  }

  // =====================================================
  // VALIDACIÓN DE JUGADORES
  // =====================================================

  findEligiblePlayer(
    playerId: string,
    teamIds: string[],
  ): Promise<{ id: string; name: string; teamId: string } | null> {
    return this.prisma.player.findFirst({
      where: {
        id: playerId,
        teamId: { in: teamIds },
        leftAt: null,
      },
      select: {
        id: true,
        name: true,
        teamId: true,
      },
    });
  }

  findEligiblePlayers(
    playerIds: string[],
    teamIds: string[],
  ): Promise<{ id: string }[]> {
    return this.prisma.player.findMany({
      where: {
        id: { in: playerIds },
        teamId: { in: teamIds },
        leftAt: null,
      },
      select: { id: true },
    });
  }

  // =====================================================
  // VALIDACIÓN DE GOL RELACIONADO
  // =====================================================

  findGoalForMatch(
    matchId: string,
    goalId: string,
  ): Promise<{
    id: string;
    playerId: string;
    player: { teamId: string };
  } | null> {
    return this.prisma.matchEvent.findFirst({
      where: {
        id: goalId,
        matchId,
        type: MatchEventType.GOL,
      },
      select: {
        id: true,
        playerId: true,
        player: {
          select: { teamId: true },
        },
      },
    });
  }

  // =====================================================
  // CREACIÓN DE EVENTOS
  // =====================================================

  createEvent(
    data: CreateMatchEventData,
  ): Promise<MatchEventWithPlayer> {
    return this.prisma.matchEvent.create({
      data: {
        matchId: data.matchId,
        playerId: data.playerId,
        type: data.type,
        minute: data.minute,
        relatedGoalId: data.relatedGoalId ?? null,
      },
      include: {
        player: {
          select: { id: true, name: true, teamId: true },
        },
      },
    });
  }

  // =====================================================
  // CONSULTA DEL MARCADOR
  // =====================================================

  findScoreboard(
    matchId: string,
  ): Promise<MatchScoreboardData | null> {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: { select: { numero: true } },
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        events: {
          where: { type: MatchEventType.GOL },
          include: {
            player: {
              select: { teamId: true },
            },
          },
        },
      },
    });
  }

  // =====================================================
  // REGISTRO DE PARTICIPACIONES
  // =====================================================

  async upsertParticipations(
    matchId: string,
    participants: MatchParticipationData[],
  ) {
    return this.prisma.$transaction(
      participants.map((participant) =>
        this.prisma.matchParticipation.upsert({
          where: {
            matchId_playerId: {
              matchId,
              playerId: participant.jugadorId,
            },
          },
          create: {
            matchId,
            playerId: participant.jugadorId,
            participated: participant.participo,
          },
          update: {
            participated: participant.participo,
          },
        }),
      ),
    );
  }
}
