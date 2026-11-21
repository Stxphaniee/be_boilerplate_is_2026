import { ApiProperty } from '@nestjs/swagger';
import type { MatchCalendarData } from '../repositories/index.js';

export class MatchCalendarTeamDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;
}

/** Respuesta de un partido dentro del calendario del equipo autenticado (HU6). */
export class MatchCalendarResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Número de la jornada publicada.' })
  jornada!: number;

  @ApiProperty({ format: 'date-time' })
  fechaHoraInicio!: string;

  @ApiProperty({ format: 'date-time' })
  fechaHoraFin!: string;

  @ApiProperty({ enum: ['A', 'B', 'C'] })
  cancha!: string;

  @ApiProperty({
    enum: ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'SUSPENDIDO', 'CANCELADO'],
  })
  estado!: string;

  @ApiProperty({ enum: ['LOCAL', 'VISITANTE'] })
  condicion!: 'LOCAL' | 'VISITANTE';

  @ApiProperty({ type: MatchCalendarTeamDto })
  equipoLocal!: MatchCalendarTeamDto;

  @ApiProperty({ type: MatchCalendarTeamDto })
  equipoVisitante!: MatchCalendarTeamDto;

  @ApiProperty({
    type: MatchCalendarTeamDto,
    description: 'Equipo rival respecto al equipo del usuario autenticado.',
  })
  rival!: MatchCalendarTeamDto;

  static fromEntity(
    match: MatchCalendarData,
    teamId: string,
  ): MatchCalendarResponseDto {
    const isHomeTeam = match.homeTeamId === teamId;
    const rival = isHomeTeam ? match.awayTeam : match.homeTeam;

    const dto = new MatchCalendarResponseDto();
    dto.id = match.id;
    dto.jornada = match.round.numero;
    dto.fechaHoraInicio = match.startsAt.toISOString();
    dto.fechaHoraFin = match.endsAt.toISOString();
    dto.cancha = match.court;
    dto.estado = match.state;
    dto.condicion = isHomeTeam ? 'LOCAL' : 'VISITANTE';
    dto.equipoLocal = {
      id: match.homeTeam.id,
      nombre: match.homeTeam.name,
    };
    dto.equipoVisitante = {
      id: match.awayTeam.id,
      nombre: match.awayTeam.name,
    };
    dto.rival = {
      id: rival.id,
      nombre: rival.name,
    };

    return dto;
  }
}