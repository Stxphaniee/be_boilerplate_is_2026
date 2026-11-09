import {
  BadRequestException,
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
import type { Season, User } from '@PrismaClient';
import type { TeamWithPlayers } from '@Teams/repositories';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  async register(
    captain: User,
    dto: CreateTeamDto,
    now: Date = new Date(),
  ): Promise<TeamWithPlayers> {
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

    if (!season.isActive) {
      throw new ConflictException('La temporada no se encuentra activa.');
    }
    this.validatePlayers(dto.players, now);

    try {
      return await this.teamRepository.create({
        seasonId: season.id,
        captainId: captain.id,
        name: dto.name,
        shortName: dto.shortName,
        players: dto.players.map((player) => ({
          name: player.name,
          dui: player.dui,
          birthDate: new Date(`${player.birthDate}T00:00:00.000Z`),
          position: player.position,
          jerseyNumber: player.jerseyNumber,
        })),
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async findMine(
    captain: User,
    now: Date = new Date(),
  ): Promise<TeamWithPlayers> {
    const season = await this.resolveSeason(undefined, now);

    const team = await this.teamRepository.findByCaptain(season.id, captain.id);

    if (!team) {
      throw new NotFoundException('Aún no has inscrito un equipo.');
    }

    return team;
  }

  private validatePlayers(players: CreateTeamDto['players'], now: Date): void {
    const duis = players.map((player) => player.dui);
    const jerseyNumbers = players.map((player) => player.jerseyNumber);

    if (new Set(duis).size !== duis.length) {
      throw new ConflictException(
        'No puedes registrar jugadores con DUI duplicado.',
      );
    }

    if (new Set(jerseyNumbers).size !== jerseyNumbers.length) {
      throw new ConflictException('Los números de camiseta deben ser únicos.');
    }

    for (const player of players) {
      const birthDate = new Date(`${player.birthDate}T00:00:00.000Z`);

      let age = now.getUTCFullYear() - birthDate.getUTCFullYear();

      const birthdayNotReached =
        now.getUTCMonth() < birthDate.getUTCMonth() ||
        (now.getUTCMonth() === birthDate.getUTCMonth() &&
          now.getUTCDate() < birthDate.getUTCDate());

      if (birthdayNotReached) {
        age--;
      }

      if (age < 18) {
        throw new BadRequestException(
          `El jugador ${player.name} debe tener al menos 18 años.`,
        );
      }
    }
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
    if (error instanceof Error && error.message === 'DUPLICATE_PLAYER_DUI') {
      return new ConflictException(
        'Uno de los jugadores ya está registrado con ese DUI.',
      );
    }

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
