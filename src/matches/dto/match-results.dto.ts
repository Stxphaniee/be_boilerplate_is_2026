
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchEventType, MatchState } from '@PrismaClient';
import type { MatchDetail, MatchResultSummary } from '@Matches/repositories';

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function shouldHideScore(state: MatchState): boolean {
  return (
    state === MatchState.SUSPENDIDO ||
    state === MatchState.CANCELADO
  );
}

function calculateGoals(
  events: Array<{
    player: { teamId: string };
    type: MatchEventType;
  }>,
  teamId: string,
): number {
  return events.filter(
    (event) =>
      event.type === MatchEventType.GOL &&
      event.player.teamId === teamId,
  ).length;
}

function getDisplayedGoals(
  state: MatchState,
  goals: number,
): number | null {
  if (shouldHideScore(state)) {
    return null;
  }

  if (state === MatchState.PROGRAMADO) {
    return 0;
  }

  return goals;
}

// =====================================================
// LISTADO DE RESULTADOS
// =====================================================

export class MatchResultTeamDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({
    minimum: 0,
    nullable: true,
    description: 'Null cuando el partido está suspendido o cancelado.',
  })
  goles!: number | null;
}

export class MatchResultItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  jornada!: number;

  @ApiProperty({ enum: MatchState })
  estado!: MatchState;

  @ApiProperty({ format: 'date-time' })
  fechaHoraInicio!: string;

  @ApiProperty({ format: 'date-time' })
  fechaHoraFin!: string;

  @ApiProperty({ enum: ['A', 'B', 'C'] })
  cancha!: string;

  @ApiProperty({ type: MatchResultTeamDto })
  equipoLocal!: MatchResultTeamDto;

  @ApiProperty({ type: MatchResultTeamDto })
  equipoVisitante!: MatchResultTeamDto;

  static fromEntity(match: MatchResultSummary): MatchResultItemDto {
    const homeGoals = calculateGoals(
      match.events,
      match.homeTeamId,
    );

    const awayGoals = calculateGoals(
      match.events,
      match.awayTeamId,
    );

    const dto = new MatchResultItemDto();

    dto.id = match.id;
    dto.jornada = match.round.numero;
    dto.estado = match.state;
    dto.fechaHoraInicio = match.startsAt.toISOString();
    dto.fechaHoraFin = match.endsAt.toISOString();
    dto.cancha = match.court;

    dto.equipoLocal = {
      id: match.homeTeamId,
      nombre: match.homeTeam.name,
      goles: getDisplayedGoals(match.state, homeGoals),
    };

    dto.equipoVisitante = {
      id: match.awayTeamId,
      nombre: match.awayTeam.name,
      goles: getDisplayedGoals(match.state, awayGoals),
    };

    return dto;
  }
}

// =====================================================
// DETALLE DE PARTIDO
// =====================================================

export class MatchEventDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  jugadorId!: string;

  @ApiProperty()
  jugador!: string;

  @ApiProperty({ format: 'uuid' })
  equipoId!: string;

  @ApiProperty({ enum: MatchEventType })
  tipo!: MatchEventType;

  @ApiProperty({ minimum: 0 })
  minuto!: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
  })
  golRelacionadoId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class MatchDetailTeamDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({
    minimum: 0,
    nullable: true,
    description: 'Null cuando el partido está suspendido o cancelado.',
  })
  goles!: number | null;
}

export class MatchDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  jornada!: number;

  @ApiProperty({ enum: MatchState })
  estado!: MatchState;

  @ApiProperty({ format: 'date-time' })
  fechaHoraInicio!: string;

  @ApiProperty({ format: 'date-time' })
  fechaHoraFin!: string;

  @ApiProperty({ enum: ['A', 'B', 'C'] })
  cancha!: string;

  @ApiProperty({ type: MatchDetailTeamDto })
  equipoLocal!: MatchDetailTeamDto;

  @ApiProperty({ type: MatchDetailTeamDto })
  equipoVisitante!: MatchDetailTeamDto;

  @ApiProperty({ type: [MatchEventDetailDto] })
  eventos!: MatchEventDetailDto[];

  @ApiProperty({
    description: 'True únicamente cuando el partido está FINALIZADO.',
  })
  galeriaDisponible!: boolean;

  static fromEntity(match: MatchDetail): MatchDetailResponseDto {
    const homeGoals = calculateGoals(
      match.events,
      match.homeTeamId,
    );

    const awayGoals = calculateGoals(
      match.events,
      match.awayTeamId,
    );

    const dto = new MatchDetailResponseDto();

    dto.id = match.id;
    dto.jornada = match.round.numero;
    dto.estado = match.state;
    dto.fechaHoraInicio = match.startsAt.toISOString();
    dto.fechaHoraFin = match.endsAt.toISOString();
    dto.cancha = match.court;

    dto.equipoLocal = {
      id: match.homeTeamId,
      nombre: match.homeTeam.name,
      goles: getDisplayedGoals(match.state, homeGoals),
    };

    dto.equipoVisitante = {
      id: match.awayTeamId,
      nombre: match.awayTeam.name,
      goles: getDisplayedGoals(match.state, awayGoals),
    };

    dto.eventos = match.events.map((event) => ({
      id: event.id,
      jugadorId: event.playerId,
      jugador: event.player.name,
      equipoId: event.player.teamId,
      tipo: event.type,
      minuto: event.minute,
      golRelacionadoId: event.relatedGoalId,
      createdAt: event.createdAt.toISOString(),
    }));

    dto.galeriaDisponible =
      match.state === MatchState.FINALIZADO;

    return dto;
  }
}
