
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser, Public, Roles } from '../../auth/decorators/index.js';
import { MatchLiveService } from '../services/index.js';

import {
  CreateMatchEventDto,
  MatchEventCreatedResponseDto,
  MatchParticipationResponseDto,
  MatchScoreboardResponseDto,
  MatchStateResponseDto,
  RefereeMatchResponseDto,
  RegisterMatchParticipantsDto,
  UpdateMatchStateDto,
} from '../dto/index.js';

import { Role, type User } from '../../generated/prisma/client.js';

@ApiTags('matches-live')
@ApiBearerAuth()
@Controller()
export class MatchLiveController {
  constructor(private readonly matchLiveService: MatchLiveService) {}

  // =====================================================
  // HU7 - PARTIDOS ASIGNADOS AL ÁRBITRO
  // =====================================================

  @Get('arbitro/mis-partidos')
  @Roles(Role.ARBITRO)
  @ApiOperation({
    summary: 'Consulta los partidos asignados al árbitro autenticado (HU7)',
  })
  @ApiOkResponse({ type: [RefereeMatchResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({ description: 'Acceso exclusivo para árbitros.' })
  async findMyAssignedMatches(
    @CurrentUser() user: User,
  ): Promise<RefereeMatchResponseDto[]> {
    const matches = await this.matchLiveService.findMyAssignedMatches(user);
    return matches.map(RefereeMatchResponseDto.fromEntity);
  }

  // =====================================================
  // HU7 - INICIAR Y FINALIZAR PARTIDO
  // =====================================================

  @Patch('partidos/:id/estado')
  @Roles(Role.ARBITRO)
  @ApiOperation({ summary: 'Inicia o finaliza un partido (HU7)' })
  @ApiOkResponse({ type: MatchStateResponseDto })
  @ApiBadRequestResponse({ description: 'La acción solicitada no es válida.' })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({
    description: 'El árbitro no está asignado al partido.',
  })
  @ApiNotFoundResponse({ description: 'El partido no existe.' })
  @ApiConflictResponse({
    description:
      'El partido no está en el estado requerido o la jornada no está publicada.',
  })
  async updateMatchState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMatchStateDto,
    @CurrentUser() user: User,
  ): Promise<MatchStateResponseDto> {
    const match = await this.matchLiveService.updateMatchState(user, id, dto);
    return MatchStateResponseDto.fromEntity(match);
  }

  // =====================================================
  // HU7 - REGISTRO DE EVENTOS
  // =====================================================

  @Post('partidos/:id/eventos')
  @Roles(Role.ARBITRO)
  @ApiOperation({ summary: 'Registra un gol, asistencia o tarjeta (HU7)' })
  @ApiCreatedResponse({ type: MatchEventCreatedResponseDto })
  @ApiBadRequestResponse({
    description: 'Minuto, jugador, tipo de evento o gol relacionado inválido.',
  })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({
    description: 'El árbitro no está asignado al partido.',
  })
  @ApiNotFoundResponse({ description: 'El partido no existe.' })
  @ApiConflictResponse({ description: 'El partido no está EN_CURSO.' })
  async createMatchEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMatchEventDto,
    @CurrentUser() user: User,
  ): Promise<MatchEventCreatedResponseDto> {
    const result = await this.matchLiveService.createEvent(user, id, dto);

    return MatchEventCreatedResponseDto.fromEntities(
      result.evento,
      result.marcador,
    );
  }

  // =====================================================
  // HU7 - REGISTRO DE PARTICIPACIONES
  // =====================================================

  @Post('partidos/:id/participantes')
  @Roles(Role.ARBITRO)
  @ApiOperation({
    summary: 'Registra los jugadores participantes del partido (HU7)',
  })
  @ApiCreatedResponse({ type: [MatchParticipationResponseDto] })
  @ApiBadRequestResponse({
    description:
      'Uno o más jugadores no pertenecen a los equipos contendientes.',
  })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({
    description: 'El árbitro no está asignado al partido.',
  })
  @ApiNotFoundResponse({ description: 'El partido no existe.' })
  @ApiConflictResponse({ description: 'El partido no está EN_CURSO.' })
  async registerMatchParticipants(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterMatchParticipantsDto,
    @CurrentUser() user: User,
  ): Promise<MatchParticipationResponseDto[]> {
    const participations = await this.matchLiveService.registerParticipants(
      user,
      id,
      dto,
    );

    return participations.map(MatchParticipationResponseDto.fromEntity);
  }

  // =====================================================
  // HU7 - MARCADOR PÚBLICO
  // =====================================================

  @Get('partidos/:id/marcador')
  @Public()
  @ApiOperation({ summary: 'Consulta el marcador público de un partido (HU7)' })
  @ApiOkResponse({ type: MatchScoreboardResponseDto })
  @ApiNotFoundResponse({
    description: 'El partido no existe o su jornada no está publicada.',
  })
  async getMatchScoreboard(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchScoreboardResponseDto> {
    const scoreboard = await this.matchLiveService.getPublicScoreboard(id);

    return MatchScoreboardResponseDto.fromEntity(scoreboard);
  }
}
