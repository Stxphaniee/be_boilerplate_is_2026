import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsUUID } from 'class-validator';
import { Court } from '@PrismaClient';

export class CreateMatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jornadaId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  equipoLocalId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  equipoVisitanteId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  arbitroId!: string;

  @ApiProperty({ enum: Court })
  @IsEnum(Court)
  cancha!: Court;

  @ApiProperty({
    example: '2026-11-20T10:00:00-06:00',
  })
  @IsDateString()
  fechaHoraInicio!: string;
}