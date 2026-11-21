import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MatchEventType, MatchState } from '../../generated/prisma/client.js';
import { MatchCorrectionService } from './match-correction.service.js';

describe('MatchCorrectionService (HU9)', () => {
  const matchId = '00000000-0000-0000-0000-000000000001';
  const organizerId = '00000000-0000-0000-0000-000000000099';
  const homePlayerId = '11111111-1111-1111-1111-111111111111';
  const awayPlayerId = '22222222-2222-2222-2222-222222222222';
  const foreignPlayerId = '33333333-3333-3333-3333-333333333333';

  const mockMatch = {
    id: matchId,
    state: MatchState.FINALIZADO,
    round: { numero: 2 },
    homeTeamId: 'home-team-uuid',
    awayTeamId: 'away-team-uuid',
    homeTeam: {
      id: 'home-team-uuid',
      name: 'Los Halcones FC',
      players: [{ id: homePlayerId, name: 'Diego Valdez', jerseyNumber: 10 }],
    },
    awayTeam: {
      id: 'away-team-uuid',
      name: 'Atlético Central',
      players: [{ id: awayPlayerId, name: 'Carlos Duarte', jerseyNumber: 9 }],
    },
    events: [
      {
        id: 'ev-1',
        playerId: homePlayerId,
        player: { name: 'Diego Valdez', teamId: 'home-team-uuid', team: { name: 'Los Halcones FC' } },
        minute: 18,
        type: MatchEventType.GOL,
      },
    ],
  };

  const createService = (overrides?: any) => {
    const tx = {
      matchEvent: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'new-ev-uuid',
            ...data,
            player: { name: 'Diego Valdez' },
          }),
        ),
      },
      auditoriaResultado: {
        create: vi.fn().mockResolvedValue({
          id: 'audit-uuid',
          createdAt: new Date(),
        }),
      },
    };

    const prisma: any = {
      match: {
        findUnique: vi.fn().mockResolvedValue(mockMatch),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(tx)),
      ...overrides,
    };

    const service = new MatchCorrectionService(prisma);
    return { service, prisma, tx };
  };

  it('obtiene el detalle editable de un partido FINALIZADO', async () => {
    const { service } = createService();
    const result = await service.getCorrectionDetail(matchId);

    expect(result.id).toBe(matchId);
    expect(result.homeScore).toBe(1);
    expect(result.awayScore).toBe(0);
    expect(result.editableEvents).toHaveLength(1);
    expect(result.roster).toHaveLength(2);
  });

  it('rechaza obtener detalle si el partido no es FINALIZADO (409)', async () => {
    const { service, prisma } = createService();
    prisma.match.findUnique.mockResolvedValue({
      ...mockMatch,
      state: MatchState.EN_CURSO,
    });

    await expect(service.getCorrectionDetail(matchId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('aplica corrección con auditoría obligatoria de forma exitosa', async () => {
    const { service, tx } = createService();
    const dto = {
      justificacion: 'Se detectó un evento cargado por duplicado.',
      eventosCorregidos: [
        {
          playerId: homePlayerId,
          minute: 18,
          type: MatchEventType.GOL,
        },
        {
          playerId: awayPlayerId,
          minute: 38,
          type: MatchEventType.GOL,
        },
      ],
    };

    const result = await service.correctMatchResult(matchId, organizerId, dto);

    expect(result.homeScore).toBe(1);
    expect(result.awayScore).toBe(1);
    expect(result.auditoriaId).toBe('audit-uuid');
    expect(result.justificacion).toBe(dto.justificacion);
    expect(tx.matchEvent.deleteMany).toHaveBeenCalled();
    expect(tx.auditoriaResultado.create).toHaveBeenCalled();
  });

  it('rechaza corrección sin texto de justificación (400)', async () => {
    const { service } = createService();
    await expect(
      service.correctMatchResult(matchId, organizerId, {
        justificacion: '   ',
        eventosCorregidos: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza corrección con justificación superior a 300 caracteres (400)', async () => {
    const { service } = createService();
    await expect(
      service.correctMatchResult(matchId, organizerId, {
        justificacion: 'A'.repeat(301),
        eventosCorregidos: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza corrección sobre partido no FINALIZADO (409)', async () => {
    const { service, prisma } = createService();
    prisma.match.findUnique.mockResolvedValue({
      ...mockMatch,
      state: MatchState.PROGRAMADO,
    });

    await expect(
      service.correctMatchResult(matchId, organizerId, {
        justificacion: 'Corrección válida',
        eventosCorregidos: [],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rechaza evento con jugador ajeno a los equipos contendientes (400)', async () => {
    const { service } = createService();
    await expect(
      service.correctMatchResult(matchId, organizerId, {
        justificacion: 'Jugador ajeno',
        eventosCorregidos: [
          {
            playerId: foreignPlayerId,
            minute: 20,
            type: MatchEventType.GOL,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza minuto de gol negativo o superior a 120 (400)', async () => {
    const { service } = createService();
    await expect(
      service.correctMatchResult(matchId, organizerId, {
        justificacion: 'Minuto inválido',
        eventosCorregidos: [
          {
            playerId: homePlayerId,
            minute: -5,
            type: MatchEventType.GOL,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
