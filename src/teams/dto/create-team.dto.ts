import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

/** Quita espacios en los extremos y colapsa los espacios repetidos. */
const cleanSpaces = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/** La sigla se guarda en mayúsculas para que "fcb" y "FCB" no convivan. */
const cleanAcronym = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateTeamDto {
  @ApiProperty({
    description: 'Nombre del equipo. Debe ser único dentro de la temporada.',
    example: 'Tigres del Norte',
    minLength: 3,
    maxLength: 80,
  })
  @Transform(cleanSpaces)
  @IsString({ message: 'El nombre del equipo debe ser texto.' })
  @Length(3, 80, {
    message: 'El nombre del equipo debe tener entre 3 y 80 caracteres.',
  })
  name!: string;

  @ApiProperty({
    description:
      'Sigla del equipo. Se guarda en mayúsculas y es única dentro de la temporada.',
    example: 'TDN',
    minLength: 2,
    maxLength: 12,
  })
  @Transform(cleanAcronym)
  @IsString({ message: 'La sigla debe ser texto.' })
  @Length(2, 12, { message: 'La sigla debe tener entre 2 y 12 caracteres.' })
  shortName!: string;

  @ApiPropertyOptional({
    description:
      'Temporada en la que se inscribe. Si se omite, se usa la temporada vigente.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('all', { message: 'seasonId debe ser un UUID válido.' })
  seasonId?: string;
}
