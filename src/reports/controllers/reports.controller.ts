import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '@Auth/decorators';
import { Role } from '@PrismaClient';
import { PaymentsReportResponseDto } from '../dto/payments-report.dto.js';
import { ReportsService } from '../services/reports.service.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(['admin/reportes/pagos', 'api/admin/reportes/pagos'])
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Consulta el reporte consolidado de pagos de la temporada activa (HU22)',
  })
  @ApiOkResponse({ type: PaymentsReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({ description: 'Acceso exclusivo para organizadores.' })
  getPaymentsReport(): Promise<PaymentsReportResponseDto> {
    return this.reportsService.getPaymentsReport();
  }

  @Get(['admin/reportes/pagos/exportar', 'api/admin/reportes/pagos/exportar'])
  @Roles(Role.ORGANIZADOR)
  @ApiOperation({
    summary: 'Exporta el reporte consolidado de pagos en PDF o XLSX (HU22)',
  })
  @ApiQuery({ name: 'formato', enum: ['pdf', 'xlsx'], required: true })
  @ApiOkResponse({ description: 'Archivo PDF o XLSX generado.' })
  @ApiBadRequestResponse({ description: 'Formato inválido (solo pdf o xlsx).' })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  @ApiForbiddenResponse({ description: 'Acceso exclusivo para organizadores.' })
  async exportPaymentsReport(
    @Query('formato') formato: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, filename } =
      await this.reportsService.exportPaymentsReport(formato);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  }
}
