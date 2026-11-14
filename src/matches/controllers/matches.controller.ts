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

import { Roles } from '@Auth/decorators';

import { MatchesService } from '@Matches/services';

import {
  CreateMatchDto,
  CreateRoundDto,
  MatchResponseDto,
  RoundResponseDto,
} from '@Matches/dto';

import { Role } from '@PrismaClient';

@ApiTags('matches')
@ApiBearerAuth()
@Controller()
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
  ) {}

  // ==========================================
  // CONSULTAS AUXILIARES HU4
  // ==========================================

  @Get('equipos-disponibles')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Lista equipos aprobados y con cuota pagada',
  })
  @ApiOkResponse({
    description: 'Equipos disponibles para programar partidos.',
  })
  async findAvailableTeams() {
    return this.matchesService.findAvailableTeams();
  }

  @Get('arbitros')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Lista árbitros activos',
  })
  @ApiOkResponse({
    description: 'Árbitros disponibles para asignación.',
  })
  async findReferees() {
    return this.matchesService.findReferees();
  }

  @Get('jornadas/:id/partidos')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Consulta los partidos de una jornada',
  })
  @ApiOkResponse({
    type: [MatchResponseDto],
  })
  @ApiNotFoundResponse({
    description: 'La jornada no existe.',
  })
  async findMatchesByRound(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResponseDto[]> {
    const matches =
      await this.matchesService.findMatchesByRound(id);

    return matches.map(MatchResponseDto.fromEntity);
  }

  // ==========================================
  // H4 - JORNADAS
  // ==========================================

  @Get('jornadas')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Lista las jornadas de la temporada activa (H4)',
  })
  @ApiOkResponse({
    type: [RoundResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  @ApiNotFoundResponse({
    description: 'No hay temporada activa.',
  })
  async findAllRounds(): Promise<RoundResponseDto[]> {
    const rounds =
      await this.matchesService.findAllRounds();

    return rounds.map(RoundResponseDto.fromEntity);
  }

  @Post('jornadas')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Crea una jornada BORRADOR (H4)',
  })
  @ApiCreatedResponse({
    type: RoundResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Número de jornada inválido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  @ApiConflictResponse({
    description: 'El número de jornada ya existe.',
  })
  async createRound(
    @Body() dto: CreateRoundDto,
  ): Promise<RoundResponseDto> {
    const round =
      await this.matchesService.createRound(dto);

    return RoundResponseDto.fromEntity(round);
  }

  @Patch('jornadas/:id/publicar')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Publica una jornada BORRADOR (H4)',
  })
  @ApiOkResponse({
    type: RoundResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  @ApiNotFoundResponse({
    description: 'La jornada no existe.',
  })
  @ApiConflictResponse({
    description:
      'La jornada no está en BORRADOR o tiene equipos suspendidos.',
  })
  async publishRound(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoundResponseDto> {
    const round =
      await this.matchesService.publishRound(id);

    return RoundResponseDto.fromEntity(round);
  }

  // ==========================================
  // H4 - PROGRAMACIÓN DE PARTIDOS
  // ==========================================

  @Post('partidos')
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Programa un partido (H4)',
  })
  @ApiCreatedResponse({
    type: MatchResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Fecha pasada, mismo equipo o datos inválidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o es inválido.',
  })
  @ApiForbiddenResponse({
    description: 'Acceso exclusivo para organizadores.',
  })
  @ApiNotFoundResponse({
    description:
      'Jornada, equipo o árbitro no encontrado.',
  })
  @ApiConflictResponse({
    description:
      'Traslape de cancha o equipo, enfrentamiento duplicado, cuota pendiente, equipo no aprobado o árbitro sin rol.',
  })
  async createMatch(
    @Body() dto: CreateMatchDto,
  ): Promise<MatchResponseDto> {
    const match =
      await this.matchesService.createMatch(dto);

    return MatchResponseDto.fromEntity(match);
  }
}