import { Body, Controller, Get, Post } from '@nestjs/common';
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
import { CreateTeamDto, TeamResponseDto } from '@Teams/dto';
import { Role, type User } from '@PrismaClient';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /** H1: inscripción de un equipo. Solo para usuarios con rol CAPITAN. */
  @Post()
  @Roles(Role.CAPITAN)
  @ApiOperation({ summary: 'Inscribe un equipo en la temporada (H1)' })
  @ApiCreatedResponse({ type: TeamResponseDto })
  @ApiBadRequestResponse({
    description: 'Nombre o sigla con formato inválido.',
  })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({
    description:
      'El usuario no es CAPITAN o ya tiene un equipo en la temporada.',
  })
  @ApiNotFoundResponse({ description: 'No hay una temporada disponible.' })
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

  /** Equipo del capitán autenticado (a donde redirige el frontend tras inscribir). */
  @Get('mine')
  @Roles(Role.CAPITAN)
  @ApiOperation({ summary: 'Consulta el equipo del capitán autenticado' })
  @ApiOkResponse({ type: TeamResponseDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({ description: 'El usuario no es CAPITAN.' })
  @ApiNotFoundResponse({
    description: 'El capitán aún no inscribió un equipo.',
  })
  async findMine(@CurrentUser() user: User): Promise<TeamResponseDto> {
    const team = await this.teamsService.findMine(user);
    return TeamResponseDto.fromEntity(team);
  }
}
