import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser, Roles } from '@Auth/decorators';
import { Role, type User } from '@PrismaClient';

import {
  MatchRefereePanelService,
} from '../services/match-referee-panel.service.js';

@ApiTags('matches-live')
@ApiBearerAuth()
@Controller('arbitro/partidos')
export class MatchRefereePanelController {
  constructor(
    private readonly panelService: MatchRefereePanelService,
  ) {}

  @Get(':id')
  @Roles(Role.ARBITRO)
  @ApiOperation({
    summary: 'Consulta el panel del partido asignado al árbitro (HU7)',
  })
  @ApiOkResponse({
    description:
      'Marcador, jugadores, eventos, participaciones y cronómetro.',
  })
  @ApiUnauthorizedResponse({
    description: 'Sesión inválida o expirada.',
  })
  @ApiForbiddenResponse({
    description: 'El árbitro no está asignado al encuentro.',
  })
  @ApiNotFoundResponse({
    description: 'Partido inexistente o jornada no publicada.',
  })
  async findPanel(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.panelService.findPanel(user, id);
  }
}