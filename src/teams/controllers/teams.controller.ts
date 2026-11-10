
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

import { CurrentUser, Roles } from '@Auth/decorators';

import { TeamsService } from '@Teams/services';

import {
  CreateTeamDto,
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
  // HU1 - INSCRIPCIÓN DE EQUIPOS
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
    summary: 'Consulta el equipo del capitán autenticado',
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
  // HU2 - VALIDACIÓN DE INSCRIPCIONES
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
}
