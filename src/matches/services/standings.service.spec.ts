import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MatchEventType, MatchState, TeamState } from '@PrismaClient';
import { StandingsService } from './standings.service.js';

describe('StandingsService (HU10)', () => {
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
    players: [{ id: 'p5' }, { id: 'p6' }],
  };

  const team4 = {
    id: 'team-4',
    name: 'Águilas Doradas',
    shortName: 'AGU',
    status: TeamState.APROBADO,
    players: [{ id: 'p7' }],
  };

  const createService = (overrides?: any) => {
    const prisma: any = {
      season: {
        findFirst: vi.fn().mockResolvedValue(mockSeason),
      },
      team: {
        findMany: vi.fn().mockResolvedValue([team1, team2, team3, team4]),
      },
      match: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      ...overrides,
    };

    const service = new StandingsService(prisma);
    return { service, prisma };
  };

  it('inicializa todos los equipos aprobados en 0 si no hay partidos jugados', async () => {
    const { service } = createService();
    const result = await service.calculateStandings();

    expect(result.equiposAprobados).toBe(4);
    expect(result.partidosFinalizados).toBe(0);
    expect(result.posiciones).toHaveLength(4);

    for (const pos of result.posiciones) {
      expect(pos.pj).toBe(0);
      expect(pos.pg).toBe(0);
      expect(pos.pe).toBe(0);
      expect(pos.pp).toBe(0);
      expect(pos.gf).toBe(0);
      expect(pos.gc).toBe(0);
      expect(pos.dg).toBe(0);
      expect(pos.pts).toBe(0);
    }
  });

  it('calcula victorias (3 pts), empates (1 pt), derrotas y diferencia de goles', async () => {
    const matches = [
      // Halcones (team1) 2 - 1 Atlético Central (team2)
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
      // Leones (team3) 1 - 1 Halcones (team1)
      {
        id: 'm2',
        homeTeamId: team3.id,
        awayTeamId: team1.id,
        state: MatchState.FINALIZADO,
        events: [
          { playerId: 'p5', type: MatchEventType.GOL },
          { playerId: 'p1', type: MatchEventType.GOL },
        ],
      },
    ];

    const { service } = createService({
      match: {
        findMany: vi.fn().mockResolvedValue(matches),
      },
    });

    const result = await service.calculateStandings();

    const halcones = result.posiciones.find((p) => p.equipoId === team1.id);
    expect(halcones).toBeDefined();
    expect(halcones?.pj).toBe(2);
    expect(halcones?.pg).toBe(1);
    expect(halcones?.pe).toBe(1);
    expect(halcones?.pp).toBe(0);
    expect(halcones?.gf).toBe(3); // 2 in m1 + 1 in m2
    expect(halcones?.gc).toBe(2); // 1 in m1 + 1 in m2
    expect(halcones?.dg).toBe(1);
    expect(halcones?.pts).toBe(4); // 3 + 1 = 4 pts
  });

  it('aplica estrictamente los 4 criterios de desempate: Pts -> DG -> GF -> Nombre alfabético', async () => {
    // Escenario de desempate:
    // Team1 y Team2 empatan en puntos (3), DG (+1), GF (2)
    // El desempate debe resolverse por orden alfabético: "Atlético Central" antes de "Los Halcones FC"
    const matches = [
      {
        id: 'm1',
        homeTeamId: team1.id,
        awayTeamId: team3.id,
        state: MatchState.FINALIZADO,
        events: [
          { playerId: 'p1', type: MatchEventType.GOL },
          { playerId: 'p2', type: MatchEventType.GOL },
          { playerId: 'p5', type: MatchEventType.GOL },
        ], // Halcones 2 - 1 Leones -> Halcones: 3 pts, DG +1, GF 2
      },
      {
        id: 'm2',
        homeTeamId: team2.id,
        awayTeamId: team3.id,
        state: MatchState.FINALIZADO,
        events: [
          { playerId: 'p3', type: MatchEventType.GOL },
          { playerId: 'p4', type: MatchEventType.GOL },
          { playerId: 'p6', type: MatchEventType.GOL },
        ], // Atlético 2 - 1 Leones -> Atlético: 3 pts, DG +1, GF 2
      },
    ];

    const { service } = createService({
      match: {
        findMany: vi.fn().mockResolvedValue(matches),
      },
    });

    const result = await service.calculateStandings();

    // Posición 1 y 2 tienen 3 puntos, DG +1, GF 2.
    // Alfabéticamente "Atlético Central" va primero que "Los Halcones FC".
    expect(result.posiciones[0].nombre).toBe('Atlético Central');
    expect(result.posiciones[1].nombre).toBe('Los Halcones FC');
  });

  it('lanza 403 Forbidden al intentar manipular manualmente puntos de la tabla', () => {
    const { service } = createService();
    expect(() => service.rejectManualUpdate()).toThrow(ForbiddenException);
  });
});
