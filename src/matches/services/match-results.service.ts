
import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchResultsRepository } from '@Matches/repositories';
import type {
  MatchDetail,
  MatchResultSummary,
} from '@Matches/repositories';

@Injectable()
export class MatchResultsService {
  constructor(
    private readonly matchResultsRepository: MatchResultsRepository,
  ) {}

  // =====================================================
  // H8 - LISTADO PÚBLICO DE RESULTADOS
  // =====================================================

  findAllResults(): Promise<MatchResultSummary[]> {
    return this.matchResultsRepository.findAllResults();
  }

  // =====================================================
  // H8 - DETALLE PÚBLICO DE PARTIDO
  // =====================================================

  async findMatchDetail(matchId: string): Promise<MatchDetail> {
    const match =
      await this.matchResultsRepository.findMatchDetail(matchId);

    if (!match) {
      throw new NotFoundException(
        'El partido solicitado no existe o su jornada no está publicada.',
      );
    }

    return match;
  }
}
