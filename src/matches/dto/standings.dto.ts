import { ApiProperty } from '@nestjs/swagger';

export class TablaPosicionesItemDto {
  @ApiProperty({ example: 1 })
  posicion: number;

  @ApiProperty({ example: 'd3b07384-d113-4672-887e-dc250f223f03' })
  equipoId: string;

  @ApiProperty({ example: 'Los Halcones FC' })
  nombre: string;

  @ApiProperty({ example: 'HAL' })
  shortName: string;

  @ApiProperty({ description: 'Partidos jugados', example: 5 })
  pj: number;

  @ApiProperty({ description: 'Partidos ganados', example: 4 })
  pg: number;

  @ApiProperty({ description: 'Partidos empatados', example: 1 })
  pe: number;

  @ApiProperty({ description: 'Partidos perdidos', example: 0 })
  pp: number;

  @ApiProperty({ description: 'Goles a favor', example: 12 })
  gf: number;

  @ApiProperty({ description: 'Goles en contra', example: 4 })
  gc: number;

  @ApiProperty({ description: 'Diferencia de goles', example: 8 })
  dg: number;

  @ApiProperty({ description: 'Puntos totales (PG * 3 + PE * 1)', example: 13 })
  pts: number;
}

export class StandingsResponseDto {
  @ApiProperty({ example: 'Liga Mayor Amateur - Temporada 2026' })
  temporada: string;

  @ApiProperty({ example: 8 })
  equiposAprobados: number;

  @ApiProperty({ example: 20 })
  partidosFinalizados: number;

  @ApiProperty({ example: 'Los Halcones FC' })
  lider: string;

  @ApiProperty({ type: [TablaPosicionesItemDto] })
  posiciones: TablaPosicionesItemDto[];
}
