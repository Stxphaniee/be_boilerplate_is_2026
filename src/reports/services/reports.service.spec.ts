import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PaymentState } from '@PrismaClient';
import { ReportsService } from './reports.service.js';

describe('ReportsService (HU22)', () => {
  it('devuelve totales en 0 y detalle vacío cuando no existe temporada activa', async () => {
    const prisma = {
      season: { findFirst: vi.fn().mockResolvedValue(null) },
      payment: { findMany: vi.fn() },
    };
    const service = new ReportsService(prisma as never);

    await expect(service.getPaymentsReport()).resolves.toEqual({
      totalEquipos: 0,
      pagados: 0,
      pendientes: 0,
      vencidos: 0,
      totalRecaudado: 0,
      detalle: [],
    });
  });

  it('consolida pagos de la temporada activa y suma totalRecaudado solo con PAGADO', async () => {
    const due = new Date('2026-11-30T00:00:00.000Z');
    const paid = new Date('2026-11-15T12:00:00.000Z');
    const prisma = {
      season: { findFirst: vi.fn().mockResolvedValue({ id: 's1' }) },
      payment: {
        findMany: vi.fn().mockResolvedValue([
          {
            amount: 50,
            status: PaymentState.PAGADO,
            dueDate: due,
            paidAt: paid,
            team: { id: 't1', name: 'Águilas FC' },
          },
          {
            amount: 50,
            status: PaymentState.PENDIENTE,
            dueDate: due,
            paidAt: null,
            team: { id: 't2', name: 'Tigres FC' },
          },
          {
            amount: 50,
            status: PaymentState.VENCIDO,
            dueDate: due,
            paidAt: null,
            team: { id: 't3', name: 'Leones FC' },
          },
        ]),
      },
    };
    const service = new ReportsService(prisma as never);
    const report = await service.getPaymentsReport();

    expect(report.totalEquipos).toBe(3);
    expect(report.pagados).toBe(1);
    expect(report.pendientes).toBe(1);
    expect(report.vencidos).toBe(1);
    expect(report.totalRecaudado).toBe(50);
    expect(report.detalle).toHaveLength(3);
  });

  it('exporta PDF y XLSX válidos y rechaza formatos inválidos con 400', async () => {
    const prisma = {
      season: { findFirst: vi.fn().mockResolvedValue(null) },
      payment: { findMany: vi.fn() },
    };
    const service = new ReportsService(prisma as never);

    const pdf = await service.exportPaymentsReport('pdf');
    expect(pdf.contentType).toBe('application/pdf');
    expect(pdf.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    const xlsx = await service.exportPaymentsReport('xlsx');
    expect(xlsx.filename).toBe('reporte-pagos.xlsx');
    expect(xlsx.buffer.subarray(0, 2).toString('ascii')).toBe('PK');

    await expect(service.exportPaymentsReport('csv')).rejects.toThrow(
      BadRequestException,
    );
  });
});
