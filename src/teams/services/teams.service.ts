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
  RosterFullError,
  RosterTooSmallError,
  PlayerDuplicateDuiError,
  JerseyNumberTakenError,
} from '@Teams/errors';

import type {
  CreateTeamDto,
  ResubmitTeamDto,
  UpdateTeamStatusDto,
  AddPlayerDto,
} from '@Teams/dto';

import { TeamState, type Season, type User, type Player } from '@PrismaClient';

import type { TeamWithPlayers, TeamWithReviewData } from '@Teams/repositories';

import { PaymentsService } from '../../payments/services/payments.service.js';
import { NotificationsService } from '../../notifications/services/notifications.service.js';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =====================================================
  // HU1 - REGISTRO DE EQUIPOS
  // =====================================================

  async register(
    captain: User,
    dto: CreateTeamDto,
    now: Date = new Date(),
  ): Promise<TeamWithPlayers> {
    const season = await this.resolveSeason(dto.seasonId, now);

    if (now < season.registrationStart || now > season.registrationEnd) {
      throw new ConflictException('El período de inscripciones está cerrado.');
    }

    if (!season.isActive) {
      throw new ConflictException('La temporada no se encuentra activa.');
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

  // =====================================================
  // HU1 - CONSULTA DEL EQUIPO
  // =====================================================

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

  // =====================================================
  // HU2 - INSCRIPCIONES PENDIENTES
  // =====================================================

  async findPending(): Promise<TeamWithReviewData[]> {
    return this.teamRepository.findPending();
  }

  // =====================================================
  // HU2 - DETALLE DE INSCRIPCIÓN
  // =====================================================

  async findForReview(teamId: string): Promise<TeamWithReviewData> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    return team;
  }

  // =====================================================
  // HU2 - APROBACIÓN Y RECHAZO
  // =====================================================

  async updateStatus(
    teamId: string,
    dto: UpdateTeamStatusDto,
  ): Promise<TeamWithReviewData> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    if (team.status !== TeamState.PENDIENTE_VALIDACION) {
      throw new ConflictException(
        'Solo se pueden aprobar o rechazar equipos pendientes de validación.',
      );
    }

    if (
      dto.status !== TeamState.APROBADO &&
      dto.status !== TeamState.RECHAZADO
    ) {
      throw new BadRequestException('El estado solicitado no es válido.');
    }

    const rejectionReason =
      dto.status === TeamState.RECHAZADO ? dto.rejectionReason?.trim() : null;

    if (
      dto.status === TeamState.RECHAZADO &&
      (!rejectionReason || rejectionReason.length > 250)
    ) {
      throw new BadRequestException(
        'El motivo de rechazo debe tener entre 1 y 250 caracteres.',
      );
    }

    let paymentAmount: string | undefined;
    let paymentDueDate: Date | undefined;

    let notification: {
      title: string;
      message: string;
    };

    if (dto.status === TeamState.APROBADO) {
      const season = await this.seasonRepository.findById(team.seasonId);

      if (!season) {
        throw new NotFoundException('No hay una temporada disponible.');
      }

      paymentAmount = season.fee.toString();

      paymentDueDate = this.paymentsService.calculateDueDate(new Date());

      notification = this.notificationsService.buildTeamApproved(team.name);
    } else {
      notification = this.notificationsService.buildTeamRejected(
        team.name,
        rejectionReason!,
      );
    }

    // El cambio de estado, el pago y la notificación
    // se guardan en una sola transacción.
    return this.teamRepository.review({
      teamId,
      status: dto.status,
      rejectionReason: rejectionReason ?? null,
      paymentAmount,
      paymentDueDate,
      notificationTitle: notification.title,
      notificationMessage: notification.message.slice(0, 500),
    });
  }

  // =====================================================
  // HU2 - CORRECCIÓN Y REENVÍO
  // =====================================================

  async resubmit(
    captain: User,
    teamId: string,
    dto: ResubmitTeamDto,
    now: Date = new Date(),
  ): Promise<TeamWithPlayers> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    if (team.captainId !== captain.id) {
      throw new ForbiddenException(
        'No puedes modificar la inscripción de otro equipo.',
      );
    }

    if (team.status !== TeamState.RECHAZADO) {
      throw new ConflictException(
        'Solo puedes reenviar equipos que hayan sido rechazados.',
      );
    }

    const season = await this.resolveSeason(team.seasonId, now);

    if (!season.isActive) {
      throw new ConflictException('La temporada no se encuentra activa.');
    }

    const correctionStart = season.registrationStart;

    const correctionEnd = season.rosterEnd;

    if (!correctionEnd) {
      throw new ConflictException(
        'La temporada no tiene configurada una fecha límite de correcciones.',
      );
    }

    if (now < correctionStart || now > correctionEnd) {
      throw new ConflictException(
        'El período permitido para corregir y reenviar inscripciones está cerrado.',
      );
    }

    this.validatePlayers(dto.players, now);

    const normalizedName = dto.name
      ? dto.name.trim().replace(/\s+/g, ' ')
      : team.name;

    if (
      await this.teamRepository.existsByNameForOtherTeam(
        team.seasonId,
        normalizedName,
        team.id,
      )
    ) {
      throw new ConflictException(
        'Ya existe un equipo con ese nombre en la temporada.',
      );
    }

    try {
      return await this.teamRepository.resubmit(team.id, {
        name: normalizedName,
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

  // =====================================================
  // VALIDACIONES COMPARTIDAS HU1 / HU2
  // =====================================================

  private validatePlayers(players: CreateTeamDto['players'], now: Date): void {
    if (players.length < 5 || players.length > 15) {
      throw new BadRequestException(
        'La plantilla debe tener entre 5 y 15 jugadores.',
      );
    }

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

      if (Number.isNaN(birthDate.getTime())) {
        throw new BadRequestException(
          `La fecha de nacimiento de ${player.name} no es válida.`,
        );
      }

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

  // =====================================================
  // RESOLUCIÓN DE TEMPORADA
  // =====================================================

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

  // =====================================================
  // MANEJO DE ERRORES
  // =====================================================

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

    if (error instanceof PlayerDuplicateDuiError) {
      return new ConflictException(
        'Ya existe un jugador registrado con ese DUI.',
      );
    }

    if (error instanceof JerseyNumberTakenError) {
      return new ConflictException(
        'El número de camiseta ya está en uso en la plantilla.',
      );
    }

    if (error instanceof RosterFullError) {
      return new BadRequestException(
        'La plantilla ya alcanzó el máximo de 15 jugadores.',
      );
    }

    if (error instanceof RosterTooSmallError) {
      return new BadRequestException(
        'No puedes dar de baja a un jugador si la plantilla quedaría con menos de 5.',
      );
    }

    return error;
  }

  async getValidationStats() {
    return this.teamRepository.getValidationStats();
  }

  // =====================================================
  // H3 - GESTIÓN DE PLANTILLA
  // =====================================================

  async getPlayers(captain: User, teamId: string): Promise<Player[]> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    if (team.captainId !== captain.id) {
      throw new ForbiddenException(
        'No puedes consultar la plantilla de un equipo ajeno.',
      );
    }

    if (team.status !== TeamState.APROBADO) {
      throw new ConflictException(
        'Solo puedes gestionar la plantilla de un equipo aprobado.',
      );
    }

    return this.teamRepository.findActivePlayers(teamId);
  }

  async addPlayer(
    captain: User,
    teamId: string,
    dto: AddPlayerDto,
    now: Date = new Date(),
  ): Promise<Player> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    if (team.captainId !== captain.id) {
      throw new ForbiddenException(
        'No puedes modificar la plantilla de un equipo ajeno.',
      );
    }

    if (team.status !== TeamState.APROBADO) {
      throw new ConflictException(
        'Solo puedes gestionar la plantilla de un equipo aprobado.',
      );
    }

    const season = await this.resolveSeason(team.seasonId, now);

    this.assertRosterWindowOpen(season, now);

    const birthDate = new Date(`${dto.birthDate}T00:00:00.000Z`);

    this.assertPlayerAge(dto.name, birthDate, now);

    try {
      return await this.teamRepository.addPlayer({
        teamId,
        name: dto.name,
        dui: dto.dui,
        birthDate,
        position: dto.position,
        jerseyNumber: dto.jerseyNumber,
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  async removePlayer(
    captain: User,
    teamId: string,
    playerId: string,
    now: Date = new Date(),
  ): Promise<Player> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    if (team.captainId !== captain.id) {
      throw new ForbiddenException(
        'No puedes modificar la plantilla de un equipo ajeno.',
      );
    }

    if (team.status !== TeamState.APROBADO) {
      throw new ConflictException(
        'Solo puedes gestionar la plantilla de un equipo aprobado.',
      );
    }

    const season = await this.resolveSeason(team.seasonId, now);

    this.assertRosterWindowOpen(season, now);

    try {
      return await this.teamRepository.removePlayer(teamId, playerId);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  // =====================================================
  // H3 - VALIDACIONES PRIVADAS
  // =====================================================

  private assertRosterWindowOpen(season: Season, now: Date): void {
    if (!season.rosterStart || !season.rosterEnd) {
      throw new ConflictException(
        'La temporada no tiene configurada la ventana de altas y bajas.',
      );
    }

    if (now < season.rosterStart || now > season.rosterEnd) {
      throw new ConflictException(
        'El período de altas y bajas de jugadores está cerrado.',
      );
    }
  }

  private assertPlayerAge(name: string, birthDate: Date, now: Date): void {
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();

    const birthdayNotReached =
      now.getUTCMonth() < birthDate.getUTCMonth() ||
      (now.getUTCMonth() === birthDate.getUTCMonth() &&
        now.getUTCDate() < birthDate.getUTCDate());

    if (birthdayNotReached) age--;

    if (age < 18) {
      throw new BadRequestException(
        `El jugador ${name} debe tener al menos 18 años.`,
      );
    }
  }
}
