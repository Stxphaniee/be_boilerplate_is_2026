import { ApiProperty } from '@nestjs/swagger';

export class GeneralReportResponseDto {
  @ApiProperty({ example: 42 })
  golesTotales!: number;

  @ApiProperty({ example: 18 })
  amarillasTotales!: number;

  @ApiProperty({ example: 3 })
  rojasTotales!: number;

  @ApiProperty({ example: 12 })
  partidosFinalizados!: number;
}
