import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@Auth/decorators';
import { Role } from '@PrismaClient';
import { GeneralReportResponseDto } from '../dto/general-report.dto.js';
import { GeneralReportService } from '../services/general-report.service.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class GeneralReportController {
  constructor(private readonly generalReportService: GeneralReportService) {}

  @Get(['admin/reportes/general', 'api/admin/reportes/general'])
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Consulta las estadísticas generales de partidos finalizados de la temporada activa (HU23)',
  })
  @ApiOkResponse({ type: GeneralReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({ description: 'Acceso exclusivo para organizadores.' })
  getGeneralReport(): Promise<GeneralReportResponseDto> {
    return this.generalReportService.getGeneralReport();
  }
}
