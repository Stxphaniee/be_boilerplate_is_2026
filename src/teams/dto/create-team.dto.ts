
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { CreatePlayerDto } from './create-player.dto.js';

const cleanSpaces = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const cleanAcronym = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateTeamDto {
  @ApiProperty({
    example: 'Los Halcones FC',
    minLength: 3,
    maxLength: 80,
  })
  @Transform(cleanSpaces)
  @IsString()
  @Length(3, 80)
  name!: string;

  @ApiProperty({
    example: 'LHF',
    minLength: 2,
    maxLength: 12,
  })
  @Transform(cleanAcronym)
  @IsString()
  @Length(2, 12)
  shortName!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all')
  seasonId?: string;

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
