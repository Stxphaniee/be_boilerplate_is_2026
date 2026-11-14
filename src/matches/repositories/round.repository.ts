import { Injectable } from '@nestjs/common';

import { PrismaService } from '@Prisma/services';

import { RoundState } from '@PrismaClient';
import type { Round } from '@PrismaClient';

@Injectable()
export class RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(seasonId: string): Promise<Round[]> {
    return this.prisma.round.findMany({
      where: { seasonId },
      orderBy: { numero: 'asc' },
    });
  }

  findById(id: string): Promise<Round | null> {
    return this.prisma.round.findUnique({
      where: { id },
    });
  }

  existsByNumero(
    seasonId: string,
    numero: number,
  ): Promise<boolean> {
    return this.prisma.round
      .count({
        where: { seasonId, numero },
      })
      .then((count) => count > 0);
  }

  create(
    seasonId: string,
    numero: number,
  ): Promise<Round> {
    return this.prisma.round.create({
      data: {
        seasonId,
        numero,
        state: RoundState.BORRADOR,
      },
    });
  }

  publish(id: string): Promise<Round> {
    return this.prisma.round.update({
      where: { id },
      data: {
        state: RoundState.PUBLICADA,
        publishedAt: new Date(),
      },
    });
  }
}