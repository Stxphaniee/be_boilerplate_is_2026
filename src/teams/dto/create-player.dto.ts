
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Position } from '@PrismaClient';

const cleanSpaces = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreatePlayerDto {
  @ApiProperty({ example: 'Carlos Alberto Ruiz Gómez' })
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
    example: '2004-03-15',
    description: 'Fecha de nacimiento. El jugador debe ser mayor de edad.',
  })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ enum: Position, example: Position.PORTERO })
  @IsEnum(Position)
  position!: Position;

  @ApiProperty({ example: 10, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  jerseyNumber!: number;
}
