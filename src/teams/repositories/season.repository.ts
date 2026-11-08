import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Season } from '@PrismaClient';

/** Acceso a datos de temporadas (solo lectura por ahora). */
@Injectable()
export class SeasonRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Season | null> {
    return this.prisma.season.findUnique({ where: { id } });
  }

  /**
   * Temporada vigente: la primera que todavía no terminó.
   *
   * El modelo Season no tiene un flag `activa`, y las inscripciones se abren
   * antes de que la temporada arranque, así que "vigente" se define por la
   * fecha de fin y no por la de inicio. Con una sola temporada cargada (el
   * supuesto del proyecto) devuelve esa; si hubiera varias, la que empieza
   * primero.
   */
  findCurrent(now: Date): Promise<Season | null> {
    return this.prisma.season.findFirst({
      where: { endDate: { gte: now } },
      orderBy: { startDate: 'asc' },
    });
  }
}
