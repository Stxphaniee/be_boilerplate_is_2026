import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentState } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type {
  PaymentReportItemDto,
  PaymentsReportResponseDto,
} from '../dto/payments-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentsReport(): Promise<PaymentsReportResponseDto> {
    const activeSeason = await this.prisma.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!activeSeason) {
      return {
        totalEquipos: 0,
        pagados: 0,
        pendientes: 0,
        vencidos: 0,
        totalRecaudado: 0,
        detalle: [],
      };
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        team: {
          seasonId: activeSeason.id,
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        team: {
          name: 'asc',
        },
      },
    });

    let pagados = 0;
    let pendientes = 0;
    let vencidos = 0;
    let totalRecaudado = 0;

    const detalle: PaymentReportItemDto[] = payments.map((p) => {
      const monto = Number(p.amount);

      if (p.status === PaymentState.PAGADO) {
        pagados += 1;
        totalRecaudado += monto;
      } else if (p.status === PaymentState.PENDIENTE) {
        pendientes += 1;
      } else if (p.status === PaymentState.VENCIDO) {
        vencidos += 1;
      }

      return {
        equipoId: p.team.id,
        equipo: p.team.name,
        monto,
        estado: p.status,
        fechaVencimiento: p.dueDate,
        fechaPago: p.paidAt,
      };
    });

    return {
      totalEquipos: detalle.length,
      pagados,
      pendientes,
      vencidos,
      totalRecaudado: Number(totalRecaudado.toFixed(2)),
      detalle,
    };
  }

  async exportPaymentsReport(formato?: string): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const normalized = (formato ?? '').trim().toLowerCase();
    if (normalized !== 'pdf' && normalized !== 'xlsx') {
      throw new BadRequestException(
        'Formato inválido. Valores permitidos: pdf o xlsx.',
      );
    }

    const report = await this.getPaymentsReport();

    if (normalized === 'pdf') {
      const buffer = await this.buildPaymentsPdf(report);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: 'reporte-pagos.pdf',
      };
    }

    const buffer = await this.buildPaymentsXlsx(report);
    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'reporte-pagos.xlsx',
    };
  }

  private buildPaymentsPdf(report: PaymentsReportResponseDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Reporte Consolidado de Pagos', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total de equipos: ${report.totalEquipos}`);
      doc.text(`Pagados: ${report.pagados}`);
      doc.text(`Pendientes: ${report.pendientes}`);
      doc.text(`Vencidos: ${report.vencidos}`);
      doc.text(`Total recaudado: $${report.totalRecaudado.toFixed(2)}`);
      doc.moveDown();

      doc.fontSize(13).text('Detalle por equipo');
      doc.moveDown(0.4);

      if (report.detalle.length === 0) {
        doc.fontSize(10).text('No hay pagos registrados para la temporada activa.');
      } else {
        for (const item of report.detalle) {
          const vencimiento = new Date(item.fechaVencimiento)
            .toISOString()
            .slice(0, 10);
          const pago = item.fechaPago
            ? new Date(item.fechaPago).toISOString().slice(0, 10)
            : 'N/A';
          doc
            .fontSize(10)
            .text(
              `${item.equipo} | Cuota: $${item.monto.toFixed(2)} | Estado: ${item.estado} | Vence: ${vencimiento} | Pagado: ${pago}`,
            );
        }
      }

      doc.end();
    });
  }

  private async buildPaymentsXlsx(
    report: PaymentsReportResponseDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte de Pagos');

    sheet.addRow(['Resumen Financiero']);
    sheet.addRow(['Total de equipos', report.totalEquipos]);
    sheet.addRow(['Pagados', report.pagados]);
    sheet.addRow(['Pendientes', report.pendientes]);
    sheet.addRow(['Vencidos', report.vencidos]);
    sheet.addRow(['Total recaudado', report.totalRecaudado]);
    sheet.addRow([]);

    sheet.addRow([
      'Equipo',
      'Cuota',
      'Estado',
      'Fecha de vencimiento',
      'Fecha de pago',
    ]);

    for (const item of report.detalle) {
      sheet.addRow([
        item.equipo,
        item.monto,
        item.estado,
        new Date(item.fechaVencimiento).toISOString().slice(0, 10),
        item.fechaPago ? new Date(item.fechaPago).toISOString().slice(0, 10) : '',
      ]);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
