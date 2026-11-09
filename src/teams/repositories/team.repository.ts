import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  CaptainAlreadyHasTeamError,
  TeamNameTakenError,
  TeamShortNameTakenError,
} from '@Teams/errors';
import { Prisma, Position } from '@PrismaClient';

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

export type TeamWithPlayers = Prisma.TeamGetPayload<{
  include: { players: true };
}>;

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        const target = error.meta?.target;

        const targetFields = Array.isArray(target)
          ? target.map(String)
          : typeof target === 'string'
            ? [target]
            : [];

        if (targetFields.some((field) => field.toLowerCase().includes('dui'))) {
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
        seasonId_captainId: { seasonId, captainId },
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
          name: { equals: name, mode: 'insensitive' },
        },
      })
      .then((count) => count > 0);
  }

  existsByShortName(seasonId: string, shortName: string): Promise<boolean> {
    return this.prisma.team
      .count({
        where: {
          seasonId,
          shortName: { equals: shortName, mode: 'insensitive' },
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
}
