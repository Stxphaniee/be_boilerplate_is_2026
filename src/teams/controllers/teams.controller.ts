import {
  Body,
  Controller,
  Delete,
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

import { CurrentUser, Roles } from '@Auth/decorators';

import { TeamsService } from '@Teams/services';

import {
  AddPlayerDto,
  CreateTeamDto,
  PlayerResponseDto,
  TeamResponseDto,
  UpdateTeamStatusDto,
  ResubmitTeamDto,
} from '@Teams/dto';

import { Role, type User } from '@PrismaClient';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // =====================================================
  // H1 - INSCRIPCIÓN DE EQUIPOS
  // =====================================================

  /**
   * H1: Inscripción de un equipo.
   * Solo para usuarios con rol CAPITAN.
   */
  @Post()
  @Roles(Role.CAPITAN)
  @ApiOperation({
    summary: 'Inscribe un equipo en la temporada (H1)',
  })
  @ApiCreatedResponse({ type: TeamResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos del equipo o jugadores inválidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description:
      'El usuario no es CAPITAN o ya tiene un equipo en la temporada.',
  })
  @ApiNotFoundResponse({
    description: 'No hay una temporada disponible.',
  })
  @ApiConflictResponse({
    description:
      'Inscripciones cerradas, o el nombre o la sigla ya existen en la temporada.',
  })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.register(user, dto);

    return TeamResponseDto.fromEntity(team);
  }

  /**
   * H1: Consulta el equipo del capitán autenticado.
   */
  @Get('mine')
  @Roles(Role.CAPITAN)
  @ApiOperation({
    summary: 'Consulta el equipo del capitán autenticado (H1)',
  })
  @ApiOkResponse({ type: TeamResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario no es CAPITAN.',
  })
  @ApiNotFoundResponse({
    description: 'El capitán aún no inscribió un equipo.',
  })
  async findMine(
    @CurrentUser() user: User,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.findMine(user);

    return TeamResponseDto.fromEntity(team);
  }

  // =====================================================
  // H2 - VALIDACIÓN DE INSCRIPCIONES
  // =====================================================

  /**
   * H2: Consulta todas las inscripciones pendientes.
   * Exclusivo para ORGANIZADOR.
   */
  @Get('pending')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Lista los equipos pendientes de validación (H2)',
  })
  @ApiOkResponse({
    type: [TeamResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  async findPending(): Promise<TeamResponseDto[]> {
    const teams = await this.teamsService.findPending();

    return teams.map((team) => TeamResponseDto.fromEntity(team));
  }

  /**
   * H2: Estadísticas de inscripciones.
   * Exclusivo para ORGANIZADOR.
   */
  @Get('stats')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Consulta las estadísticas de inscripciones (H2)',
  })
  @ApiOkResponse({
    description: 'Estadísticas de inscripciones.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  async getValidationStats() {
    return this.teamsService.getValidationStats();
  }

  /**
   * H2: Consulta el detalle de una inscripción.
   * Exclusivo para ORGANIZADOR.
   */
  @Get(':id')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Consulta el detalle de una inscripción (H2)',
  })
  @ApiOkResponse({
    type: TeamResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  @ApiNotFoundResponse({
    description: 'El equipo solicitado no existe.',
  })
  async findForReview(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.findForReview(id);

    return TeamResponseDto.fromEntity(team);
  }

  /**
   * H2: Aprueba o rechaza una inscripción.
   * Exclusivo para ORGANIZADOR.
   */
  @Patch(':id/status')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Aprueba o rechaza una inscripción (H2)',
  })
  @ApiOkResponse({
    type: TeamResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El motivo de rechazo es inválido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  @ApiNotFoundResponse({
    description: 'El equipo solicitado no existe.',
  })
  @ApiConflictResponse({
    description: 'El equipo no se encuentra pendiente de validación.',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamStatusDto,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.updateStatus(id, dto);

    return TeamResponseDto.fromEntity(team);
  }

  /**
   * H2: Corrige y reenvía una inscripción rechazada.
   * Exclusivo para el CAPITAN propietario.
   */
  @Patch(':id/resubmit')
  @Roles(Role.CAPITAN)
  @ApiOperation({
    summary: 'Corrige y reenvía una inscripción (H2)',
  })
  @ApiOkResponse({
    type: TeamResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Los datos de los jugadores son inválidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'El equipo no pertenece al capitán autenticado.',
  })
  @ApiNotFoundResponse({
    description: 'El equipo solicitado no existe.',
  })
  @ApiConflictResponse({
    description:
      'El equipo no está rechazado o el período de corrección está cerrado.',
  })
  async resubmit(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResubmitTeamDto,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.resubmit(user, id, dto);

    return TeamResponseDto.fromEntity(team);
  }

  // =====================================================
  // H3 - GESTIÓN DE PLANTILLA
  // =====================================================

  /**
   * H3: Consulta los jugadores activos de la plantilla.
   * Exclusivo para el CAPITAN propietario.
   */
  @Get(':id/players')
  @Roles(Role.CAPITAN)
  @ApiOperation({
    summary: 'Consulta la plantilla activa del equipo (H3)',
  })
  @ApiOkResponse({
    type: [PlayerResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'El equipo no pertenece al capitán autenticado.',
  })
  @ApiNotFoundResponse({
    description: 'El equipo solicitado no existe.',
  })
  @ApiConflictResponse({
    description: 'El equipo no está aprobado.',
  })
  async getPlayers(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlayerResponseDto[]> {
    const players = await this.teamsService.getPlayers(user, id);

    return players.map(PlayerResponseDto.fromEntity);
  }

  /**
   * H3: Agrega un jugador a la plantilla.
   * Exclusivo para el CAPITAN propietario.
   */
  @Post(':id/players')
  @Roles(Role.CAPITAN)
  @ApiOperation({
    summary: 'Agrega un jugador a la plantilla (H3)',
  })
  @ApiCreatedResponse({ type: PlayerResponseDto })
  @ApiBadRequestResponse({
    description:
      'Datos del jugador inválidos, menor de edad o plantilla llena.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'El equipo no pertenece al capitán autenticado.',
  })
  @ApiNotFoundResponse({
    description: 'El equipo solicitado no existe.',
  })
  @ApiConflictResponse({
    description:
      'Período cerrado, DUI duplicado o número de camiseta en uso.',
  })
  async addPlayer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPlayerDto,
  ): Promise<PlayerResponseDto> {
    const player = await this.teamsService.addPlayer(user, id, dto);

    return PlayerResponseDto.fromEntity(player);
  }

  /**
   * H3: Da de baja lógica a un jugador de la plantilla.
   * Exclusivo para el CAPITAN propietario.
   */
  @Patch(':id/players/:playerId/leave')
  @Roles(Role.CAPITAN)
  @ApiOperation({
    summary: 'Da de baja a un jugador de la plantilla (H3)',
  })
  @ApiOkResponse({ type: PlayerResponseDto })
  @ApiBadRequestResponse({
    description: 'La plantilla quedaría con menos de 5 jugadores.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'El equipo no pertenece al capitán autenticado.',
  })
  @ApiNotFoundResponse({
    description: 'El equipo o jugador no existe, o el jugador ya fue dado de baja.',
  })
  @ApiConflictResponse({
    description:
      'Período cerrado, equipo no aprobado o jugador en partido EN_CURSO.',
  })
  async removePlayer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ): Promise<PlayerResponseDto> {
    const player = await this.teamsService.removePlayer(user, id, playerId);

    return PlayerResponseDto.fromEntity(player);
  }
}