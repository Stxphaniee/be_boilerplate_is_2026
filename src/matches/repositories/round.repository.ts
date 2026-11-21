import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/services/index.js';

import { RoundState } from '../../generated/prisma/client.js';
import type { Round } from '../../generated/prisma/client.js';

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

  async publish(id: string): Promise<Round | null> {
    const { count } = await this.prisma.round.updateMany({
      where: { id, state: RoundState.BORRADOR },
      data: {
        state: RoundState.PUBLICADA,
        publishedAt: new Date(),
      },
    });

    if (count === 0) return null;

    return this.findById(id);
  }
}