import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MatchEventType } from '@PrismaClient';

export class EventoCorregidoDto {
  @ApiProperty({ description: 'ID del jugador', example: 'd3b07384-d113-4672-887e-dc250f223f03' })
  @IsUUID()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ description: 'Minuto del gol', example: 18, minimum: 0, maximum: 120 })
  @IsInt()
  @Min(0)
  @Max(120)
  minute: number;

  @ApiProperty({ enum: MatchEventType, default: MatchEventType.GOL })
  @IsEnum(MatchEventType)
  type: MatchEventType = MatchEventType.GOL;
}

export class CorregirResultadoDto {
  @ApiProperty({
    description: 'Justificación obligatoria de la corrección administrativa (máx. 300 caracteres)',
    example: 'Se detectó un evento cargado por duplicado.',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty({ message: 'La justificación es obligatoria.' })
  @MaxLength(300, { message: 'La justificación no puede exceder 300 caracteres.' })
  justificacion: string;

  @ApiProperty({
    type: [EventoCorregidoDto],
    description: 'Lista de eventos de gol oficiales corregidos',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventoCorregidoDto)
  eventosCorregidos: EventoCorregidoDto[];
}

export class MatchCorrectionDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  jornadaNumero: number;

  @ApiProperty()
  homeTeam: { id: string; name: string };

  @ApiProperty()
  awayTeam: { id: string; name: string };

  @ApiProperty()
  homeScore: number;

  @ApiProperty()
  awayScore: number;

  @ApiProperty()
  state: string;

  @ApiProperty()
  editableEvents: Array<{
    id: string;
    minute: number;
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    type: string;
  }>;

  @ApiProperty()
  roster: Array<{
    id: string;
    name: string;
    jerseyNumber: number;
    teamId: string;
    teamName: string;
  }>;
}
