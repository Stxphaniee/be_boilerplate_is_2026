import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '@Auth/decorators';
import { Role, type User } from '@PrismaClient';
import { MatchCorrectionService } from '../services/match-correction.service.js';
import {
  CorregirResultadoDto,
  MatchCorrectionDetailDto,
} from '../dto/match-correction.dto.js';

@ApiTags('results-correction')
@ApiBearerAuth()
@Controller('partidos')
export class MatchCorrectionController {
  constructor(
    private readonly matchCorrectionService: MatchCorrectionService,
  ) {}

  @Get(':id/corregir')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Obtiene el detalle y eventos editables de un partido para corregir (HU9)',
  })
  @ApiOkResponse({ type: MatchCorrectionDetailDto })
  @ApiUnauthorizedResponse({ description: 'Falta token o es inválido.' })
  @ApiForbiddenResponse({ description: 'Acceso exclusivo para rol Organizador.' })
  @ApiNotFoundResponse({ description: 'Partido no encontrado.' })
  @ApiConflictResponse({ description: 'El partido no está en estado FINALIZADO.' })
  async getCorrectionDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchCorrectionDetailDto> {
    return this.matchCorrectionService.getCorrectionDetail(id);
  }

  @Post(':id/corregir')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Aplica corrección administrativa sobre eventos de gol con auditoría (HU9)',
  })
  @ApiOkResponse({
    description: 'Corrección aplicada exitosamente con registro de auditoría.',
  })
  @ApiBadRequestResponse({
    description: 'Justificación ausente/mayor a 300 caracteres o eventos inválidos.',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o es inválido.' })
  @ApiForbiddenResponse({ description: 'Acceso exclusivo para rol Organizador.' })
  @ApiNotFoundResponse({ description: 'Partido no encontrado.' })
  @ApiConflictResponse({ description: 'El partido no está en estado FINALIZADO.' })
  async correctMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: CorregirResultadoDto,
  ) {
    return this.matchCorrectionService.correctMatchResult(id, user.id, dto);
  }
}
