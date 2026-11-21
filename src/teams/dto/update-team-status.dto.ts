
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';
import { TeamState } from '@PrismaClient';

const cleanSpaces = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : value;

export class UpdateTeamStatusDto {
  @ApiProperty({
    enum: [TeamState.APROBADO, TeamState.RECHAZADO],
    example: TeamState.APROBADO,
  })
  @IsIn([TeamState.APROBADO, TeamState.RECHAZADO], {
    message: 'El estado debe ser APROBADO o RECHAZADO.',
  })
  status!: TeamState;

  @ApiPropertyOptional({
    description: 'Obligatorio cuando el estado es RECHAZADO.',
    maxLength: 250,
    example: 'La plantilla contiene información incompleta.',
  })
  @ValidateIf((dto: UpdateTeamStatusDto) =>
    dto.status === TeamState.RECHAZADO,
  )
  @Transform(cleanSpaces)
  @IsString({
    message: 'El motivo de rechazo debe ser texto.',
  })
  @Length(1, 250, {
    message: 'El motivo de rechazo debe tener entre 1 y 250 caracteres.',
  })
  rejectionReason?: string;
}
