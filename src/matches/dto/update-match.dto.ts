
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { Court } from '../../generated/prisma/client.js';

export enum UpdateMatchAction {
  PROGRAMADO = 'PROGRAMADO',
  SUSPENDIDO = 'SUSPENDIDO',
  CANCELADO = 'CANCELADO',
}

export class UpdateMatchDto {
  @ApiPropertyOptional({
    example: '2026-11-21T10:00:00-06:00',
    description: 'Nueva fecha y hora de inicio. ISO 8601 con zona horaria.',
  })
  @IsOptional()
  @IsDateString()
  fechaHoraInicio?: string;

  @ApiPropertyOptional({
    enum: Court,
    example: Court.B,
  })
  @IsOptional()
  @IsEnum(Court)
  cancha?: Court;

  @ApiPropertyOptional({
    enum: UpdateMatchAction,
    example: UpdateMatchAction.SUSPENDIDO,
    description: 'Estado destino. Omitir para solo editar fecha/cancha.',
  })
  @IsOptional()
  @IsEnum(UpdateMatchAction)
  estado?: UpdateMatchAction;

  @ApiPropertyOptional({
    example: 'Lluvia intensa en la cancha.',
    description: 'Obligatorio cuando estado = SUSPENDIDO. Máx. 250 caracteres.',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(1, 250, {
    message: 'El motivo de suspensión debe tener entre 1 y 250 caracteres.',
  })
  motivoSuspension?: string;
}
