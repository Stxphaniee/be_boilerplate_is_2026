
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NotificationsService } from '../../notifications/services/notifications.service.js';

import { MatchLiveRepository } from '@Matches/repositories';

import type {
  MatchEventWithPlayer,
  MatchScoreboardData,
  RefereeMatchData,
} from '@Matches/repositories';

import {
  MatchEventType,
  MatchState,
  RoundState,
  type Match,
  type User,
} from '@PrismaClient';

import type {
  CreateMatchEventDto,
  RegisterMatchParticipantsDto,
  UpdateMatchStateDto,
} from '@Matches/dto';

@Injectable()
export class MatchLiveService {
  constructor(
    private readonly matchLiveRepository: MatchLiveRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =====================================================
  // HU7 - PARTIDOS ASIGNADOS AL ÁRBITRO
  // =====================================================

  findMyAssignedMatches(referee: User): Promise<RefereeMatchData[]> {
    return this.matchLiveRepository.findRefereeMatches(referee.id);
  }

  // =====================================================
  // HU7 - INICIAR Y FINALIZAR PARTIDO
  // =====================================================

  async updateMatchState(
    referee: User,
    matchId: string,
    dto: UpdateMatchStateDto,
  ): Promise<Match> {
    const match = await this.findMatchAssignedToReferee(matchId, referee);

    // Iniciar partido.
    if (dto.estado === MatchState.EN_CURSO) {
      if (match.state !== MatchState.PROGRAMADO) {
        throw new ConflictException(
          'Solo se puede iniciar un partido en estado PROGRAMADO.',
        );
      }

      if (match.round.state !== RoundState.PUBLICADA) {
        throw new ConflictException(
          'No se puede iniciar un partido cuya jornada no ha sido publicada.',
        );
      }

      const updated = await this.matchLiveRepository.updateStateIfCurrent(
        matchId,
        MatchState.PROGRAMADO,
        MatchState.EN_CURSO,
      );

      if (!updated) {
        throw new ConflictException(
          'El estado del partido cambió. Actualiza la información e inténtalo nuevamente.',
        );
      }

      const updatedMatch =
        await this.matchLiveRepository.findMatchForLive(matchId);

      if (!updatedMatch) {
        throw new NotFoundException('El partido solicitado no existe.');
      }

      return updatedMatch;
    }

    // Finalizar partido.
    if (dto.estado === MatchState.FINALIZADO) {
      if (match.state !== MatchState.EN_CURSO) {
        throw new ConflictException(
          'Solo se puede finalizar un partido en estado EN_CURSO.',
        );
      }

      const updated = await this.matchLiveRepository.updateStateIfCurrent(
        matchId,
        MatchState.EN_CURSO,
        MatchState.FINALIZADO,
      );

      if (!updated) {
        throw new ConflictException(
          'El partido ya fue finalizado o su estado cambió.',
        );
      }

      const updatedMatch =
        await this.matchLiveRepository.findMatchForLive(matchId);

      if (!updatedMatch) {
        throw new NotFoundException('El partido solicitado no existe.');
      }

      // Notificar el resultado final mediante el Módulo 9.
      await this.notificationsService.notifyMatchResult(matchId);

      return updatedMatch;
    }

    throw new BadRequestException(
      'La acción solicitada debe iniciar o finalizar el partido.',
    );
  }

  // =====================================================
  // HU7 - REGISTRO DE EVENTOS
  // =====================================================

  async createEvent(
    referee: User,
    matchId: string,
    dto: CreateMatchEventDto,
  ): Promise<{
    evento: MatchEventWithPlayer;
    marcador: MatchScoreboardData;
  }> {
    const match = await this.findMatchAssignedToReferee(matchId, referee);

    this.assertMatchInProgress(match);

    // Validar que el jugador pertenezca a alguno de los equipos.
    const player = await this.matchLiveRepository.findEligiblePlayer(
      dto.jugadorId,
      [match.homeTeamId, match.awayTeamId],
    );

    if (!player) {
      throw new BadRequestException(
        'El jugador indicado no pertenece a los equipos contendientes o no está activo.',
      );
    }

    let relatedGoalId: string | null = null;

    // Validaciones específicas de las asistencias.
    if (dto.tipo === MatchEventType.ASISTENCIA) {
      if (!dto.golRelacionadoId) {
        throw new BadRequestException(
          'Una asistencia debe estar vinculada a un gol válido.',
        );
      }

      const goal = await this.matchLiveRepository.findGoalForMatch(
        matchId,
        dto.golRelacionadoId,
      );

      if (!goal) {
        throw new BadRequestException(
          'El gol relacionado no existe o no pertenece a este partido.',
        );
      }

      // La asistencia debe pertenecer al mismo equipo que marcó el gol.
      if (goal.player.teamId !== player.teamId) {
        throw new BadRequestException(
          'La asistencia y el gol deben pertenecer al mismo equipo.',
        );
      }

      // Un jugador no puede asistirse a sí mismo.
      if (goal.playerId === player.id) {
        throw new BadRequestException(
          'El autor del gol no puede registrarse como su propio asistente.',
        );
      }

      relatedGoalId = goal.id;
    } else if (dto.golRelacionadoId) {
      throw new BadRequestException(
        'El campo golRelacionadoId solo se utiliza para eventos ASISTENCIA.',
      );
    }

    // Guardar evento.
    const evento = await this.matchLiveRepository.createEvent({
      matchId,
      playerId: player.id,
      type: dto.tipo,
      minute: dto.minuto,
      relatedGoalId,
    });

    // Obtener marcador actualizado.
    const marcador = await this.matchLiveRepository.findScoreboard(matchId);

    if (!marcador) {
      throw new NotFoundException('No se encontró el marcador del partido.');
    }

    return { evento, marcador };
  }

  // =====================================================
  // HU7 - REGISTRO DE PARTICIPACIONES
  // =====================================================

  async registerParticipants(
    referee: User,
    matchId: string,
    dto: RegisterMatchParticipantsDto,
  ) {
    const match = await this.findMatchAssignedToReferee(matchId, referee);

    this.assertMatchInProgress(match);

    const playerIds = dto.participantes.map(
      (participant) => participant.jugadorId,
    );

    // Verificar que todos pertenezcan a los equipos contendientes.
    const eligiblePlayers = await this.matchLiveRepository.findEligiblePlayers(
      playerIds,
      [match.homeTeamId, match.awayTeamId],
    );

    if (eligiblePlayers.length !== playerIds.length) {
      throw new BadRequestException(
        'Todos los jugadores deben pertenecer a los equipos contendientes y estar activos.',
      );
    }

    // Insertar o actualizar respetando la restricción única.
    return this.matchLiveRepository.upsertParticipations(
      matchId,
      dto.participantes,
    );
  }

  // =====================================================
  // HU7 - MARCADOR PÚBLICO
  // =====================================================

  async getPublicScoreboard(matchId: string): Promise<MatchScoreboardData> {
    const match = await this.matchLiveRepository.findMatchForLive(matchId);

    if (!match) {
      throw new NotFoundException('El partido solicitado no existe.');
    }

    if (match.round.state !== RoundState.PUBLICADA) {
      throw new NotFoundException(
        'El partido todavía no está disponible públicamente.',
      );
    }

    const scoreboard = await this.matchLiveRepository.findScoreboard(matchId);

    if (!scoreboard) {
      throw new NotFoundException('No se encontró el marcador del partido.');
    }

    return scoreboard;
  }

  // =====================================================
  // VALIDACIONES PRIVADAS
  // =====================================================

  private async findMatchAssignedToReferee(
    matchId: string,
    referee: User,
  ) {
    const match = await this.matchLiveRepository.findMatchForLive(matchId);

    if (!match) {
      throw new NotFoundException('El partido solicitado no existe.');
    }

    if (match.refereeId !== referee.id) {
      throw new ForbiddenException(
        'No estás asignado como árbitro de este partido.',
      );
    }

    return match;
  }

  private assertMatchInProgress(match: { state: MatchState }): void {
    if (match.state !== MatchState.EN_CURSO) {
      throw new ConflictException(
        'Solo se pueden registrar eventos y participaciones en partidos EN_CURSO.',
      );
    }
  }
}
