import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  CaptainAlreadyHasTeamError,
  TeamNameTakenError,
  TeamShortNameTakenError,
  PlayerDuplicateDuiError,
  JerseyNumberTakenError,
  RosterFullError,
  RosterTooSmallError,
} from '@Teams/errors';
import { Prisma, Position, TeamState, PaymentState } from '@PrismaClient';
import type { Player } from '@PrismaClient';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export interface CreateTeamData {
  seasonId: string;
  captainId: string;
  name: string;
  shortName: string;
  players: {
    name: string;
    dui: string;
    birthDate: Date;
    position: Position;
    jerseyNumber: number;
  }[];
}

export interface ResubmitTeamData {
  name?: string;
  players: {
    name: string;
    dui: string;
    birthDate: Date;
    position: Position;
    jerseyNumber: number;
  }[];
}

export interface AddPlayerData {
  teamId: string;
  name: string;
  dui: string;
  birthDate: Date;
  position: Position;
  jerseyNumber: number;
}

export interface ReviewTeamData {
  teamId: string;
  status: TeamState;
  rejectionReason: string | null;
  paymentAmount?: string;
  paymentDueDate?: Date;
  notificationTitle: string;
  notificationMessage: string;
}

export type TeamWithPlayers = Prisma.TeamGetPayload<{
  include: { players: true };
}>;

export type TeamWithReviewData = Prisma.TeamGetPayload<{
  include: {
    players: true;
    captain: {
      select: {
        id: true;
        email: true;
      };
    };
    payments: true;
  };
}>;

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // HU1 - REGISTRO DE EQUIPOS
  // =====================================================

  async create(data: CreateTeamData): Promise<TeamWithPlayers> {
    try {
      return await this.prisma.team.create({
        data: {
          seasonId: data.seasonId,
          captainId: data.captainId,
          name: data.name,
          shortName: data.shortName,
          players: {
            create: data.players,
          },
        },
        include: {
          players: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        if (this.isDuiConflict(error)) {
          throw new Error('DUPLICATE_PLAYER_DUI');
        }

        throw (await this.resolveConflict(data)) ?? error;
      }

      throw error;
    }
  }

  findByCaptain(
    seasonId: string,
    captainId: string,
  ): Promise<TeamWithPlayers | null> {
    return this.prisma.team.findUnique({
      where: {
        seasonId_captainId: {
          seasonId,
          captainId,
        },
      },
      include: {
        players: true,
      },
    });
  }

  existsByName(seasonId: string, name: string): Promise<boolean> {
    return this.prisma.team
      .count({
        where: {
          seasonId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      })
      .then((count) => count > 0);
  }

  existsByShortName(seasonId: string, shortName: string): Promise<boolean> {
    return this.prisma.team
      .count({
        where: {
          seasonId,
          shortName: {
            equals: shortName,
            mode: 'insensitive',
          },
        },
      })
      .then((count) => count > 0);
  }

  private async resolveConflict(data: CreateTeamData): Promise<Error | null> {
    if (await this.findByCaptain(data.seasonId, data.captainId)) {
      return new CaptainAlreadyHasTeamError(data.captainId);
    }

    if (await this.existsByName(data.seasonId, data.name)) {
      return new TeamNameTakenError(data.name);
    }

    if (await this.existsByShortName(data.seasonId, data.shortName)) {
      return new TeamShortNameTakenError(data.shortName);
    }

    return null;
  }

  // =====================================================
  // HU2 - CONSULTA DE INSCRIPCIONES
  // =====================================================

  findPending(): Promise<TeamWithReviewData[]> {
    return this.prisma.team.findMany({
      where: {
        status: TeamState.PENDIENTE_VALIDACION,
      },
      include: {
        players: true,
        captain: {
          select: {
            id: true,
            email: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findByIdForReview(id: string): Promise<TeamWithReviewData | null> {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        players: true,
        captain: {
          select: {
            id: true,
            email: true,
          },
        },
        payments: true,
      },
    });
  }

  // =====================================================
  // HU2 - ACTUALIZACIÓN DE ESTADO
  // =====================================================

  updateStatus(
    id: string,
    status: TeamState,
    rejectionReason: string | null,
  ): Promise<TeamWithReviewData> {
    return this.prisma.team.update({
      where: { id },
      data: {
        status,
        rejectionReason,
      },
      include: {
        players: true,
        captain: {
          select: {
            id: true,
            email: true,
          },
        },
        payments: true,
      },
    });
  }

  async review(data: ReviewTeamData): Promise<TeamWithReviewData> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.team.updateMany({
        where: {
          id: data.teamId,
          status: TeamState.PENDIENTE_VALIDACION,
        },
        data: {
          status: data.status,
          rejectionReason: data.rejectionReason,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'El equipo ya fue revisado o su estado cambió.',
        );
      }

      const team = await tx.team.findUniqueOrThrow({
        where: { id: data.teamId },
        include: {
          players: true,
          captain: {
            select: {
              id: true,
              email: true,
            },
          },
          payments: true,
        },
      });

      if (data.status === TeamState.APROBADO) {
        if (!data.paymentAmount || !data.paymentDueDate) {
          throw new Error('Faltan los datos de la cuota de inscripción.');
        }

        await tx.payment.create({
          data: {
            teamId: team.id,
            amount: data.paymentAmount,
            status: PaymentState.PENDIENTE,
            dueDate: data.paymentDueDate,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: team.captainId,
          title: data.notificationTitle,
          message: data.notificationMessage,
        },
      });

      return team;
    });
  }

  // =====================================================
  // HU2 - VALIDACIONES DE REENVÍO
  // =====================================================

  existsByNameForOtherTeam(
    seasonId: string,
    name: string,
    teamId: string,
  ): Promise<boolean> {
    return this.prisma.team
      .count({
        where: {
          seasonId,
          id: { not: teamId },
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      })
      .then((count) => count > 0);
  }

  // =====================================================
  // HU2 - CORRECCIÓN Y REENVÍO
  // =====================================================

  async resubmit(
    teamId: string,
    data: ResubmitTeamData,
  ): Promise<TeamWithPlayers> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.team.updateMany({
          where: {
            id: teamId,
            status: TeamState.RECHAZADO,
          },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            status: TeamState.PENDIENTE_VALIDACION,
            rejectionReason: null,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'El equipo ya fue reenviado o su estado cambió.',
          );
        }

        await tx.player.deleteMany({ where: { teamId } });

        await tx.player.createMany({
          data: data.players.map((player) => ({
            teamId,
            name: player.name,
            dui: player.dui,
            birthDate: player.birthDate,
            position: player.position,
            jerseyNumber: player.jerseyNumber,
          })),
        });

        return tx.team.findUniqueOrThrow({
          where: { id: teamId },
          include: { players: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        if (this.isDuiConflict(error)) {
          throw new Error('DUPLICATE_PLAYER_DUI');
        }

        const target = this.constraintFields(error);

        if (target.some((field) => field.toLowerCase().includes('name'))) {
          throw new TeamNameTakenError(data.name ?? '');
        }

        throw new ConflictException('La corrección contiene datos duplicados.');
      }

      throw error;
    }
  }

  // =====================================================
  // UTILIDADES PRIVADAS
  // =====================================================

  private constraintFields(
    error: Prisma.PrismaClientKnownRequestError,
  ): string[] {
    const target = error.meta?.target;
    if (Array.isArray(target)) return target.map(String);
    if (typeof target === 'string') return [target];
    return [];
  }

  private isDuiConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
    return this.constraintFields(error).some((field) =>
      field.toLowerCase().includes('dui'),
    );
  }

  async getValidationStats() {
    const grouped = await this.prisma.team.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const countByStatus = (status: TeamState) =>
      grouped.find((item) => item.status === status)?._count._all ?? 0;

    return {
      pending: countByStatus(TeamState.PENDIENTE_VALIDACION),
      approved: countByStatus(TeamState.APROBADO),
      rejected: countByStatus(TeamState.RECHAZADO),
      total: grouped.reduce((total, item) => total + item._count._all, 0),
    };
  }

  // =====================================================
  // H3 - GESTIÓN DE PLANTILLA
  // =====================================================

  findActivePlayers(teamId: string): Promise<Player[]> {
    return this.prisma.player.findMany({
      where: { teamId, leftAt: null },
      orderBy: { jerseyNumber: 'asc' },
    });
  }

  async addPlayer(data: AddPlayerData): Promise<Player> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const activeCount = await tx.player.count({
          where: { teamId: data.teamId, leftAt: null },
        });

        if (activeCount >= 15) {
          throw new RosterFullError();
        }

        const jerseyTaken = await tx.player.findFirst({
          where: {
            teamId: data.teamId,
            jerseyNumber: data.jerseyNumber,
            leftAt: null,
          },
        });

        if (jerseyTaken) {
          throw new JerseyNumberTakenError(data.jerseyNumber);
        }

        return tx.player.create({
          data: {
            teamId: data.teamId,
            name: data.name,
            dui: data.dui,
            birthDate: data.birthDate,
            position: data.position,
            jerseyNumber: data.jerseyNumber,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        if (this.isDuiConflict(error)) {
          throw new PlayerDuplicateDuiError(data.dui);
        }
      }

      throw error;
    }
  }

  async removePlayer(teamId: string, playerId: string): Promise<Player> {
    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findFirst({
        where: { id: playerId, teamId, leftAt: null },
      });

      if (!player) {
        throw new NotFoundException(
          'El jugador no existe o ya fue dado de baja.',
        );
      }

      const activeCount = await tx.player.count({
        where: { teamId, leftAt: null },
      });

      if (activeCount <= 5) {
        throw new RosterTooSmallError();
      }

      return tx.player.update({
        where: { id: playerId },
        data: { leftAt: new Date() },
      });
    });
  }
}