
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { CreatePlayerDto } from './create-player.dto.js';

const cleanSpaces = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : value;

export class ResubmitTeamDto {
  @ApiPropertyOptional({
    example: 'Barcelona FC',
    minLength: 3,
    maxLength: 80,
  })
  @IsOptional()
  @Transform(cleanSpaces)
  @IsString()
  @Length(3, 80)
  name?: string;

  @ApiProperty({
    type: [CreatePlayerDto],
    minItems: 5,
    maxItems: 15,
  })
  @IsArray()
  @ArrayMinSize(5, {
    message: 'El equipo debe tener al menos 5 jugadores.',
  })
  @ArrayMaxSize(15, {
    message: 'El equipo no puede superar los 15 jugadores.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePlayerDto)
  players!: CreatePlayerDto[];
}
