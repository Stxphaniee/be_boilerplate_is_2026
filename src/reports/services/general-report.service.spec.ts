import { describe, expect, it, vi } from 'vitest';
import { MatchEventType, MatchState } from '@PrismaClient';
import { GeneralReportService } from './general-report.service.js';

describe('GeneralReportService (HU23)', () => {
  it('devuelve todos los contadores en 0 cuando no hay temporada activa', async () => {
    const prisma = {
      season: { findFirst: vi.fn().mockResolvedValue(null) },
      match: { count: vi.fn() },
      matchEvent: { groupBy: vi.fn() },
    };
    const service = new GeneralReportService(prisma as never);

    await expect(service.getGeneralReport()).resolves.toEqual({
      golesTotales: 0,
      amarillasTotales: 0,
      rojasTotales: 0,
      partidosFinalizados: 0,
    });
    expect(prisma.match.count).not.toHaveBeenCalled();
  });

  it('filtra únicamente partidos FINALIZADOS de la temporada activa y suma goles y tarjetas', async () => {
    const prisma = {
      season: { findFirst: vi.fn().mockResolvedValue({ id: 'season-1' }) },
      match: { count: vi.fn().mockResolvedValue(5) },
      matchEvent: {
        groupBy: vi.fn().mockResolvedValue([
          { type: MatchEventType.GOL, _count: { _all: 14 } },
          { type: MatchEventType.AMARILLA, _count: { _all: 7 } },
          { type: MatchEventType.ROJA, _count: { _all: 2 } },
        ]),
      },
    };
    const service = new GeneralReportService(prisma as never);

    const res = await service.getGeneralReport();

    expect(res).toEqual({
      golesTotales: 14,
      amarillasTotales: 7,
      rojasTotales: 2,
      partidosFinalizados: 5,
    });
    expect(prisma.match.count).toHaveBeenCalledWith({
      where: {
        state: MatchState.FINALIZADO,
        round: { seasonId: 'season-1' },
      },
    });
  });

  it('devuelve 0 en métricas sin eventos aunque existan partidos finalizados', async () => {
    const prisma = {
      season: { findFirst: vi.fn().mockResolvedValue({ id: 'season-1' }) },
      match: { count: vi.fn().mockResolvedValue(2) },
      matchEvent: { groupBy: vi.fn().mockResolvedValue([]) },
    };
    const service = new GeneralReportService(prisma as never);

    await expect(service.getGeneralReport()).resolves.toEqual({
      golesTotales: 0,
      amarillasTotales: 0,
      rojasTotales: 0,
      partidosFinalizados: 2,
    });
  });
});
