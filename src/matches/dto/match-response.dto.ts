import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Match, Round } from '@PrismaClient';

export class RoundResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  numero!: number;

  @ApiProperty()
  state!: string;

  @ApiPropertyOptional()
  publishedAt!: Date | null;

  @ApiProperty()
  seasonId!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(round: Round): RoundResponseDto {
    const dto = new RoundResponseDto();

    dto.id = round.id;
    dto.numero = round.numero;
    dto.state = round.state;
    dto.publishedAt = round.publishedAt;
    dto.seasonId = round.seasonId;
    dto.createdAt = round.createdAt;

    return dto;
  }
}

export class MatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  estado!: string;

  @ApiProperty()
  fechaHoraInicio!: string;

  @ApiProperty()
  fechaHoraFin!: string;

  @ApiProperty()
  cancha!: string;

  @ApiProperty({ format: 'uuid' })
  jornadaId!: string;

  @ApiProperty({ format: 'uuid' })
  equipoLocalId!: string;

  @ApiProperty({ format: 'uuid' })
  equipoVisitanteId!: string;

  @ApiProperty({ format: 'uuid' })
  arbitroId!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(match: Match): MatchResponseDto {
    const dto = new MatchResponseDto();

    dto.id = match.id;
    dto.estado = match.state;
    dto.fechaHoraInicio = match.startsAt.toISOString();
    dto.fechaHoraFin = match.endsAt.toISOString();
    dto.cancha = match.court;
    dto.jornadaId = match.roundId;
    dto.equipoLocalId = match.homeTeamId;
    dto.equipoVisitanteId = match.awayTeamId;
    dto.arbitroId = match.refereeId;
    dto.createdAt = match.createdAt;

    return dto;
  }
}