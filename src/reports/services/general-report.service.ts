import { Injectable } from '@nestjs/common';
import { MatchEventType, MatchState } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';
import type { GeneralReportResponseDto } from '../dto/general-report.dto.js';

@Injectable()
export class GeneralReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneralReport(): Promise<GeneralReportResponseDto> {
    const activeSeason = await this.prisma.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!activeSeason) {
      return {
        golesTotales: 0,
        amarillasTotales: 0,
        rojasTotales: 0,
        partidosFinalizados: 0,
      };
    }

    const finishedMatchFilter = {
      state: MatchState.FINALIZADO,
      round: {
        seasonId: activeSeason.id,
      },
    };

    const [partidosFinalizados, groupedEvents] = await Promise.all([
      this.prisma.match.count({
        where: finishedMatchFilter,
      }),
      this.prisma.matchEvent.groupBy({
        by: ['type'],
        where: {
          type: {
            in: [
              MatchEventType.GOL,
              MatchEventType.AMARILLA,
              MatchEventType.ROJA,
            ],
          },
          match: finishedMatchFilter,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    let golesTotales = 0;
    let amarillasTotales = 0;
    let rojasTotales = 0;

    for (const row of groupedEvents) {
      if (row.type === MatchEventType.GOL) {
        golesTotales = row._count._all;
      } else if (row.type === MatchEventType.AMARILLA) {
        amarillasTotales = row._count._all;
      } else if (row.type === MatchEventType.ROJA) {
        rojasTotales = row._count._all;
      }
    }

    return {
      golesTotales,
      amarillasTotales,
      rojasTotales,
      partidosFinalizados,
    };
  }
}
