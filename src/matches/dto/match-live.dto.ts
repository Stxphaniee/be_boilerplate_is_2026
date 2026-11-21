
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { MatchEventType, MatchState } from '../../generated/prisma/client.js';
import type { Match, MatchParticipation } from '../../generated/prisma/client.js';

import type {
  MatchEventWithPlayer,
  MatchScoreboardData,
  RefereeMatchData,
} from '../repositories/index.js';

// =====================================================
// ACTUALIZACIÓN DEL ESTADO
// =====================================================

export class UpdateMatchStateDto {
  @ApiProperty({
    enum: [MatchState.EN_CURSO, MatchState.FINALIZADO],
    example: MatchState.EN_CURSO,
  })
  @IsIn([MatchState.EN_CURSO, MatchState.FINALIZADO])
  estado!: MatchState;
}

// =====================================================
// CREACIÓN DE EVENTOS
// =====================================================

export class CreateMatchEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jugadorId!: string;

  @ApiProperty({ enum: MatchEventType, example: MatchEventType.GOL })
  @IsEnum(MatchEventType)
  tipo!: MatchEventType;

  @ApiProperty({ example: 35, minimum: 0 })
  @IsInt()
  @Min(0)
  minuto!: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Obligatorio únicamente cuando tipo = ASISTENCIA.',
  })
  @IsOptional()
  @IsUUID()
  golRelacionadoId?: string;
}

// =====================================================
// PARTICIPANTES
// =====================================================

export class MatchParticipantInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jugadorId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  participo!: boolean;
}

export class RegisterMatchParticipantsDto {
  @ApiProperty({ type: [MatchParticipantInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique(
    (participant: MatchParticipantInputDto) => participant.jugadorId,
    {
      message: 'No se puede repetir un jugador en la lista de participantes.',
    },
  )
  @ValidateNested({ each: true })
  @Type(() => MatchParticipantInputDto)
  participantes!: MatchParticipantInputDto[];
}

// =====================================================
// MARCADOR
// =====================================================

export class MatchScoreboardTeamDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ minimum: 0 })
  goles!: number;
}

export class MatchScoreboardResponseDto {
  @ApiProperty({ format: 'uuid' })
  partidoId!: string;

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

  @ApiProperty({ type: MatchScoreboardTeamDto })
  equipoLocal!: MatchScoreboardTeamDto;

  @ApiProperty({ type: MatchScoreboardTeamDto })
  equipoVisitante!: MatchScoreboardTeamDto;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn!: string;

  static fromEntity(match: MatchScoreboardData): MatchScoreboardResponseDto {
    const homeGoals = match.events.filter(
      (event) => event.player.teamId === match.homeTeamId,
    ).length;

    const awayGoals = match.events.filter(
      (event) => event.player.teamId === match.awayTeamId,
    ).length;

    const dto = new MatchScoreboardResponseDto();

    dto.partidoId = match.id;
    dto.jornada = match.round.numero;
    dto.estado = match.state;
    dto.fechaHoraInicio = match.startsAt.toISOString();
    dto.fechaHoraFin = match.endsAt.toISOString();
    dto.cancha = match.court;

    dto.equipoLocal = {
      id: match.homeTeam.id,
      nombre: match.homeTeam.name,
      goles: homeGoals,
    };

    dto.equipoVisitante = {
      id: match.awayTeam.id,
      nombre: match.awayTeam.name,
      goles: awayGoals,
    };

    const latestGoalAt = match.events.reduce(
      (latest, event) => (event.createdAt > latest ? event.createdAt : latest),
      match.updatedAt,
    );

    dto.actualizadoEn = latestGoalAt.toISOString();

    return dto;
  }
}

// =====================================================
// RESPUESTA DE EVENTOS
// =====================================================

export class MatchEventResponseDto {
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

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  golRelacionadoId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static fromEntity(event: MatchEventWithPlayer): MatchEventResponseDto {
    const dto = new MatchEventResponseDto();

    dto.id = event.id;
    dto.jugadorId = event.playerId;
    dto.jugador = event.player.name;
    dto.equipoId = event.player.teamId;
    dto.tipo = event.type;
    dto.minuto = event.minute;
    dto.golRelacionadoId = event.relatedGoalId;
    dto.createdAt = event.createdAt.toISOString();

    return dto;
  }
}

export class MatchEventCreatedResponseDto {
  @ApiProperty({ type: MatchEventResponseDto })
  evento!: MatchEventResponseDto;

  @ApiProperty({ type: MatchScoreboardResponseDto })
  marcador!: MatchScoreboardResponseDto;

  static fromEntities(
    event: MatchEventWithPlayer,
    scoreboard: MatchScoreboardData,
  ): MatchEventCreatedResponseDto {
    const dto = new MatchEventCreatedResponseDto();

    dto.evento = MatchEventResponseDto.fromEntity(event);
    dto.marcador = MatchScoreboardResponseDto.fromEntity(scoreboard);

    return dto;
  }
}

// =====================================================
// RESPUESTA DE PARTICIPACIONES
// =====================================================

export class MatchParticipationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  partidoId!: string;

  @ApiProperty({ format: 'uuid' })
  jugadorId!: string;

  @ApiProperty()
  participo!: boolean;

  static fromEntity(
    participation: MatchParticipation,
  ): MatchParticipationResponseDto {
    const dto = new MatchParticipationResponseDto();

    dto.id = participation.id;
    dto.partidoId = participation.matchId;
    dto.jugadorId = participation.playerId;
    dto.participo = participation.participated;

    return dto;
  }
}

// =====================================================
// RESPUESTA DE ESTADO
// =====================================================

export class MatchStateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: MatchState })
  estado!: MatchState;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  static fromEntity(match: Match): MatchStateResponseDto {
    const dto = new MatchStateResponseDto();

    dto.id = match.id;
    dto.estado = match.state;
    dto.updatedAt = match.updatedAt.toISOString();

    return dto;
  }
}

// =====================================================
// PARTIDOS ASIGNADOS AL ÁRBITRO
// =====================================================

export class RefereeMatchTeamDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;
}

export class RefereeMatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  jornada!: number;

  @ApiProperty({ format: 'date-time' })
  fechaHoraInicio!: string;

  @ApiProperty({ format: 'date-time' })
  fechaHoraFin!: string;

  @ApiProperty({ enum: ['A', 'B', 'C'] })
  cancha!: string;

  @ApiProperty({ enum: MatchState })
  estado!: MatchState;

  @ApiProperty({ type: RefereeMatchTeamDto })
  equipoLocal!: RefereeMatchTeamDto;

  @ApiProperty({ type: RefereeMatchTeamDto })
  equipoVisitante!: RefereeMatchTeamDto;

  static fromEntity(match: RefereeMatchData): RefereeMatchResponseDto {
    const dto = new RefereeMatchResponseDto();

    dto.id = match.id;
    dto.jornada = match.round.numero;
    dto.fechaHoraInicio = match.startsAt.toISOString();
    dto.fechaHoraFin = match.endsAt.toISOString();
    dto.cancha = match.court;
    dto.estado = match.state;

    dto.equipoLocal = {
      id: match.homeTeam.id,
      nombre: match.homeTeam.name,
    };

    dto.equipoVisitante = {
      id: match.awayTeam.id,
      nombre: match.awayTeam.name,
    };

    return dto;
  }
}
