import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  CaptainAlreadyHasTeamError,
  TeamNameTakenError,
  TeamShortNameTakenError,
} from '@Teams/errors';
import { Prisma, type Team } from '@PrismaClient';

/** Código de Prisma para violación de restricción única. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export interface CreateTeamData {
  seasonId: string;
  captainId: string;
  name: string;
  shortName: string;
}

/**
 * Único punto del módulo que habla con la tabla `teams`.
 *
 * Las unicidades (nombre, sigla y capitán por temporada) las garantiza la base
 * de datos con índices únicos; el servicio además consulta antes para dar un
 * mensaje claro, pero esa consulta tiene una carrera entre la lectura y el
 * insert. Por eso, si el insert igual falla con P2002, acá se averigua qué
 * restricción fue y se lanza el error de dominio correspondiente.
 */
@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @throws {CaptainAlreadyHasTeamError} el capitán ya tiene equipo en la temporada.
   * @throws {TeamNameTakenError} el nombre ya existe en la temporada.
   * @throws {TeamShortNameTakenError} la sigla ya existe en la temporada.
   */
  async create(data: CreateTeamData): Promise<Team> {
    try {
      return await this.prisma.team.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw (await this.resolveConflict(data)) ?? error;
      }
      throw error;
    }
  }

  findByCaptain(seasonId: string, captainId: string): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { seasonId_captainId: { seasonId, captainId } },
    });
  }

  /** Comparación sin distinguir mayúsculas: "Tigres" y "TIGRES" son el mismo nombre. */
  existsByName(seasonId: string, name: string): Promise<boolean> {
    return this.prisma.team
      .count({
        where: { seasonId, name: { equals: name, mode: 'insensitive' } },
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
