import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SeasonRepository, TeamRepository } from '@Teams/repositories';
import {
  CaptainAlreadyHasTeamError,
  TeamNameTakenError,
  TeamShortNameTakenError,
} from '@Teams/errors';
import type { CreateTeamDto } from '@Teams/dto';
import type { Season, Team, User } from '@PrismaClient';

/**
 * Lógica de negocio de equipos.
 *
 * No conoce Prisma: todo el acceso a datos pasa por los repositorios.
 */
@Injectable()
export class TeamsService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  /**
   * H1: el capitán inscribe su equipo. Queda en estado PENDIENTE.
   *
   * `now` se recibe como parámetro (con la hora actual por defecto) para poder
   * probar el período de inscripciones sin depender del reloj real.
   */
  async register(
    captain: User,
    dto: CreateTeamDto,
    now: Date = new Date(),
  ): Promise<Team> {
    const season = await this.resolveSeason(dto.seasonId, now);

    if (now < season.registrationStart || now > season.registrationEnd) {
      throw new ConflictException('El período de inscripciones está cerrado.');
    }

    if (await this.teamRepository.findByCaptain(season.id, captain.id)) {
      throw new ForbiddenException(
        'Ya tienes un equipo inscrito en esta temporada.',
      );
    }
    if (await this.teamRepository.existsByName(season.id, dto.name)) {
      throw new ConflictException(
        'Ya existe un equipo con ese nombre en la temporada.',
      );
    }
    if (await this.teamRepository.existsByShortName(season.id, dto.shortName)) {
      throw new ConflictException(
        'Ya existe un equipo con esa sigla en la temporada.',
      );
    }

    try {
      return await this.teamRepository.create({
        seasonId: season.id,
        captainId: captain.id,
        name: dto.name,
        shortName: dto.shortName,
      });
    } catch (error) {
      // Carrera: otro request ganó el insert entre la consulta y el create.
      throw this.toHttpException(error);
    }
  }

  /** Equipo del capitán autenticado en la temporada vigente. */
  async findMine(captain: User, now: Date = new Date()): Promise<Team> {
    const season = await this.resolveSeason(undefined, now);
    const team = await this.teamRepository.findByCaptain(season.id, captain.id);
    if (!team) {
      throw new NotFoundException('Aún no has inscrito un equipo.');
    }
    return team;
  }

  private async resolveSeason(
    seasonId: string | undefined,
    now: Date,
  ): Promise<Season> {
    const season = seasonId
      ? await this.seasonRepository.findById(seasonId)
      : await this.seasonRepository.findCurrent(now);

    if (!season) {
      throw new NotFoundException('No hay una temporada disponible.');
    }
    return season;
  }

  private toHttpException(error: unknown): unknown {
    if (error instanceof CaptainAlreadyHasTeamError) {
      return new ForbiddenException(
        'Ya tienes un equipo inscrito en esta temporada.',
      );
    }
    if (error instanceof TeamNameTakenError) {
      return new ConflictException(
        'Ya existe un equipo con ese nombre en la temporada.',
      );
    }
    if (error instanceof TeamShortNameTakenError) {
      return new ConflictException(
        'Ya existe un equipo con esa sigla en la temporada.',
      );
    }
    return error;
  }
}
