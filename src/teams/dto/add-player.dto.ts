import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Position } from '@PrismaClient';

const cleanSpaces = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/**
 * DTO para agregar un jugador individual a la plantilla (H3).
 *
 * Reutiliza las mismas reglas de validación de CreatePlayerDto
 * pero vive en su propio archivo para mantener la separación
 * de responsabilidades entre H1 y H3.
 */
export class AddPlayerDto {
  @ApiProperty({ example: 'Ana María López Gómez' })
  @Transform(cleanSpaces)
  @IsString()
  @Length(3, 100)
  name!: string;

  @ApiProperty({
    example: '01234567-8',
    description: 'DUI salvadoreño con formato 00000000-0.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^\d{8}-\d$/, {
    message: 'El DUI debe tener el formato 00000000-0.',
  })
  dui!: string;

  @ApiProperty({
    example: '2000-05-20',
    description: 'Fecha de nacimiento. El jugador debe ser mayor de edad.',
  })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ enum: Position, example: Position.DEFENSA })
  @IsEnum(Position)
  position!: Position;

  @ApiProperty({ example: 7, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  jerseyNumber!: number;
}