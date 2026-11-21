
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../auth/decorators/index.js';
import { MatchResultsService } from '../services/index.js';
import {
  MatchDetailResponseDto,
  MatchResultItemDto,
} from '../dto/index.js';

@ApiTags('results')
@Controller()
export class MatchResultsController {
  constructor(
    private readonly matchResultsService: MatchResultsService,
  ) {}

  // =====================================================
  // H8 - LISTADO PÚBLICO DE RESULTADOS
  // =====================================================

  @Get('partidos/resultados')
  @Public()
  @ApiOperation({
    summary: 'Listado público de resultados por jornada con marcador (H8)',
  })
  @ApiOkResponse({ type: [MatchResultItemDto] })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor.',
  })
  async findAllResults(): Promise<MatchResultItemDto[]> {
    const matches = await this.matchResultsService.findAllResults();

    return matches.map(MatchResultItemDto.fromEntity);
  }

  // =====================================================
  // H8 - DETALLE PÚBLICO DE PARTIDO
  // =====================================================

  @Get('partidos/:id')
  @Public()
  @ApiOperation({
    summary: 'Detalle público de un partido con eventos cronológicos (H8)',
  })
  @ApiOkResponse({ type: MatchDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'El partido no existe o no está publicado.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor.',
  })
  async findMatchDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchDetailResponseDto> {
    const match = await this.matchResultsService.findMatchDetail(id);

    return MatchDetailResponseDto.fromEntity(match);
  }
}
