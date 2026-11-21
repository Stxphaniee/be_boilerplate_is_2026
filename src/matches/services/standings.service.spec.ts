import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MatchEventType, MatchState, TeamState } from '@PrismaClient';
import { StandingsService } from './standings.service.js';

describe('StandingsService (HU11)', () => {
  const seasonId = 'season-uuid-2026';

  const mockSeason = {
    id: seasonId,
    name: 'Liga Mayor Amateur - Temporada 2026',
    isActive: true,
  };

  const team1 = {
    id: 'team-1',
    name: 'Los Halcones FC',
    shortName: 'HAL',
    status: TeamState.APROBADO,
    players: [{ id: 'p1' }, { id: 'p2' }],
  };

  const team2 = {
    id: 'team-2',
    name: 'Atlético Central',
    shortName: 'ATC',
    status: TeamState.APROBADO,
    players: [{ id: 'p3' }, { id: 'p4' }],
  };

  const team3 = {
    id: 'team-3',
    name: 'Leones del Sur',
    shortName: 'LEO',
    status: TeamState.APROBADO,
    players: [{ id: 'p5' }],
  };

  const createService = (overrides?: any) => {
    const prisma: any = {
      season: {
        findFirst: vi.fn().mockResolvedValue(mockSeason),
      },
      team: {
        findMany: vi.fn().mockResolvedValue([team1, team2, team3]),
      },
      match: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      ...overrides,
    };

    const service = new StandingsService(prisma);
    return { service, prisma };
  };

  it('retorna la tabla de posiciones con métricas oficiales calculadas', async () => {
    const matches = [
      {
        id: 'm1',
        homeTeamId: team1.id,
        awayTeamId: team2.id,
        state: MatchState.FINALIZADO,
        events: [
          { playerId: 'p1', type: MatchEventType.GOL },
          { playerId: 'p2', type: MatchEventType.GOL },
          { playerId: 'p3', type: MatchEventType.GOL },
        ],
      },
    ];

    const { service } = createService({
      match: {
        findMany: vi.fn().mockResolvedValue(matches),
      },
    });

    const result = await service.calculateStandings();

    expect(result.lider).toBe('Los Halcones FC');
    expect(result.partidosFinalizados).toBe(1);
    expect(result.posiciones[0].posicion).toBe(1);
    expect(result.posiciones[0].pts).toBe(3);
    expect(result.posiciones[1].posicion).toBe(2);
    expect(result.posiciones[1].pts).toBe(0);
    // Equipo 3 sin partidos jugados con 0 pts
    expect(result.posiciones[2].pj).toBe(0);
    expect(result.posiciones[2].pts).toBe(0);
  });

  it('impide manipulación manual de la tabla con 403', () => {
    const { service } = createService();
    expect(() => service.rejectManualUpdate()).toThrow(ForbiddenException);
  });
});
