import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationPreferencesResponseDto {
  @ApiProperty({ example: true })
  pagos!: boolean;

  @ApiProperty({ example: true })
  calendario!: boolean;

  @ApiProperty({ example: true })
  resultados!: boolean;

  @ApiProperty({ example: true })
  inscripciones!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pagos?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  calendario?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  resultados?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inscripciones?: boolean;
}
