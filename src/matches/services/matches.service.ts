import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  RoundRepository,
  MatchRepository,
} from '@Matches/repositories';

import {
  SeasonRepository,
  TeamRepository,
} from '@Teams/repositories';

import { PrismaService } from '@Prisma/services';

import type {
  CreateMatchDto,
  CreateRoundDto,
} from '@Matches/dto';

import {
  Court,
  Role,
  RoundState,
  TeamState,
  PaymentState,
} from '@PrismaClient';

import type {
  Match,
  Round,
  User,
  Team,
} from '@PrismaClient';

const MATCH_DURATION_MINUTES = 90;

@Injectable()
export class MatchesService {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly matchRepository: MatchRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly teamRepository: TeamRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // JORNADAS
  // ==========================================

  async findAllRounds(): Promise<Round[]> {
    const season = await this.seasonRepository.findCurrent(new Date());

    if (!season) {
      throw new NotFoundException('No hay una temporada activa.');
    }

    return this.roundRepository.findAll(season.id);
  }

  async createRound(dto: CreateRoundDto): Promise<Round> {
    const season = await this.seasonRepository.findCurrent(new Date());

    if (!season) {
      throw new NotFoundException('No hay una temporada activa.');
    }

    if (
      await this.roundRepository.existsByNumero(
        season.id,
        dto.numero,
      )
    ) {
      throw new ConflictException(
        `La jornada ${dto.numero} ya existe en la temporada.`,
      );
    }

    return this.roundRepository.create(season.id, dto.numero);
  }

  async publishRound(roundId: string): Promise<Round> {
    const round = await this.roundRepository.findById(roundId);

    if (!round) {
      throw new NotFoundException(
        'La jornada solicitada no existe.',
      );
    }

    if (round.state !== RoundState.BORRADOR) {
      throw new ConflictException(
        'Solo se pueden publicar jornadas en estado BORRADOR.',
      );
    }

    if (await this.matchRepository.hasSuspendedTeam(roundId)) {
      throw new ConflictException(
        'La jornada contiene partidos con equipos suspendidos. Revísalos antes de publicar.',
      );
    }

    return this.roundRepository.publish(roundId);
  }

  // ==========================================
  // PARTIDOS
  // ==========================================

  async createMatch(
    dto: CreateMatchDto,
    now: Date = new Date(),
  ): Promise<Match> {
    // 1. Validar jornada.
    const round = await this.roundRepository.findById(dto.jornadaId);

    if (!round) {
      throw new NotFoundException(
        'La jornada solicitada no existe.',
      );
    }

    if (round.state !== RoundState.BORRADOR) {
      throw new ConflictException(
        'Solo se pueden programar partidos en jornadas BORRADOR.',
      );
    }

    // 2. Validar equipos distintos.
    if (dto.equipoLocalId === dto.equipoVisitanteId) {
      throw new BadRequestException(
        'El equipo local y visitante no pueden ser el mismo.',
      );
    }

    // 3. Validar fecha futura.
    const startsAt = new Date(dto.fechaHoraInicio);

    if (isNaN(startsAt.getTime())) {
      throw new BadRequestException(
        'La fecha de inicio no es válida.',
      );
    }

    if (startsAt <= now) {
      throw new BadRequestException(
        'La fecha del partido debe ser futura.',
      );
    }

    const endsAt = new Date(
      startsAt.getTime() + MATCH_DURATION_MINUTES * 60_000,
    );

    // 4. Validar árbitro.
    const referee = await this.findAndValidateReferee(dto.arbitroId);

    // 5. Validar equipos.
    await this.validateTeam(dto.equipoLocalId);
    await this.validateTeam(dto.equipoVisitanteId);

    // 6. Validar traslapes.
    const court = dto.cancha as Court;

    if (
      await this.matchRepository.hasCourtOverlap(
        court,
        startsAt,
        endsAt,
      )
    ) {
      throw new ConflictException(
        `La cancha ${dto.cancha} ya está ocupada en ese intervalo.`,
      );
    }

    if (
      await this.matchRepository.hasTeamOverlap(
        dto.equipoLocalId,
        dto.equipoVisitanteId,
        startsAt,
        endsAt,
      )
    ) {
      throw new ConflictException(
        'Uno de los equipos ya tiene un partido programado en ese intervalo.',
      );
    }

    // 7. Validar enfrentamiento duplicado.
    if (
      await this.matchRepository.hasDuplicateFixture(
        dto.jornadaId,
        dto.equipoLocalId,
        dto.equipoVisitanteId,
      )
    ) {
      throw new ConflictException(
        'Este enfrentamiento ya está programado en la jornada.',
      );
    }

    // 8. Crear partido.
    return this.matchRepository.create({
      roundId: dto.jornadaId,
      homeTeamId: dto.equipoLocalId,
      awayTeamId: dto.equipoVisitanteId,
      refereeId: referee.id,
      court,
      startsAt,
      endsAt,
    });
  }

  // ==========================================
  // CONSULTAS AUXILIARES PARA HU4
  // ==========================================

  async findMatchesByRound(roundId: string): Promise<Match[]> {
    const round = await this.roundRepository.findById(roundId);

    if (!round) {
      throw new NotFoundException(
        'La jornada solicitada no existe.',
      );
    }

    return this.matchRepository.findByRound(roundId);
  }

  async findAvailableTeams(): Promise<
    Pick<Team, 'id' | 'name'>[]
  > {
    const season = await this.seasonRepository.findCurrent(new Date());

    if (!season) {
      throw new NotFoundException('No hay una temporada activa.');
    }

    return this.prisma.team.findMany({
      where: {
        seasonId: season.id,
        status: TeamState.APROBADO,
        payments: {
          some: {
            status: PaymentState.PAGADO,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findReferees(): Promise<
    Pick<User, 'id' | 'email'>[]
  > {
    return this.prisma.user.findMany({
      where: {
        role: Role.ARBITRO,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        email: 'asc',
      },
    });
  }

  // ==========================================
  // VALIDACIONES PRIVADAS
  // ==========================================

  private async findAndValidateReferee(
    refereeId: string,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: refereeId,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'El árbitro seleccionado no existe.',
      );
    }

    if (
      user.role !== Role.ARBITRO ||
      !user.isActive
    ) {
      throw new ConflictException(
        'El usuario seleccionado no es un árbitro activo.',
      );
    }

    return user;
  }

  private async validateTeam(teamId: string): Promise<void> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException(
        `El equipo ${teamId} no existe.`,
      );
    }

    if (team.status === TeamState.SUSPENDIDO) {
      throw new ConflictException(
        `El equipo "${team.name}" está suspendido y no puede participar.`,
      );
    }

    if (team.status !== TeamState.APROBADO) {
      throw new ConflictException(
        `El equipo "${team.name}" no está aprobado.`,
      );
    }

    const payment = team.payments?.[0];

    if (!payment || payment.status !== PaymentState.PAGADO) {
      throw new ConflictException(
        `El equipo "${team.name}" no tiene la cuota de inscripción pagada.`,
      );
    }
  }
}