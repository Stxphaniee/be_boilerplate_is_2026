import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { TeamsService } from '@Teams/services';
import { SeasonRepository, TeamRepository } from '@Teams/repositories';

import {
  CaptainAlreadyHasTeamError,
  TeamNameTakenError,
  TeamShortNameTakenError,
} from '@Teams/errors';

import type { Season, Team, User } from '@PrismaClient';
import { Position, TeamState } from '@PrismaClient';

import type { PaymentsService } from '../../payments/services/payments.service.js';
import type { NotificationsService } from '../../notifications/services/notifications.service.js';

const season = {
  id: 'season-1',
  name: 'Liga Mayor Amateur - Temporada 2026',
  registrationStart: new Date('2026-11-01T00:00:00'),
  registrationEnd: new Date('2026-11-15T23:59:59'),
  isActive: true,
} as Season;

const captain = {
  id: 'captain-1',
  role: 'CAPITAN',
} as User;

const dto = {
  name: 'Tigres del Norte',
  shortName: 'TDN',
  players: [
    {
      name: 'Jugador Uno',
      dui: '00000001-0',
      birthDate: '1990-01-01',
      position: Position.PORTERO,
      jerseyNumber: 1,
    },
    {
      name: 'Jugador Dos',
      dui: '00000002-0',
      birthDate: '1991-02-01',
      position: Position.DEFENSA,
      jerseyNumber: 2,
    },
    {
      name: 'Jugador Tres',
      dui: '00000003-0',
      birthDate: '1992-03-01',
      position: Position.MEDIOCAMPISTA,
      jerseyNumber: 3,
    },
    {
      name: 'Jugador Cuatro',
      dui: '00000004-0',
      birthDate: '1993-04-01',
      position: Position.DELANTERO,
      jerseyNumber: 4,
    },
    {
      name: 'Jugador Cinco',
      dui: '00000005-0',
      birthDate: '1994-05-01',
      position: Position.DEFENSA,
      jerseyNumber: 5,
    },
  ],
};

const insideWindow = new Date('2026-11-08T12:00:00');

const paymentsService = {
  calculateDueDate: vi.fn(),
} as unknown as PaymentsService;

const notificationsService = {
  buildTeamApproved: vi.fn(),
  buildTeamRejected: vi.fn(),
} as unknown as NotificationsService;

function createTeamsService(
  teams: TeamRepository,
  seasons: SeasonRepository,
): TeamsService {
  return new TeamsService(
    teams,
    seasons,
    paymentsService,
    notificationsService,
  );
}

describe('TeamsService.register (H1)', () => {
  let teams: {
    create: ReturnType<typeof vi.fn>;
    findByCaptain: ReturnType<typeof vi.fn>;
    existsByName: ReturnType<typeof vi.fn>;
    existsByShortName: ReturnType<typeof vi.fn>;
  };

  let seasons: {
    findById: ReturnType<typeof vi.fn>;
    findCurrent: ReturnType<typeof vi.fn>;
  };

  let service: TeamsService;

  beforeEach(() => {
    vi.clearAllMocks();

    teams = {
      create: vi.fn(
        async (data) =>
          ({
            id: 'team-1',
            status: TeamState.PENDIENTE_VALIDACION,
            ...data,
          }) as Team,
      ),

      findByCaptain: vi.fn().mockResolvedValue(null),

      existsByName: vi.fn().mockResolvedValue(false),

      existsByShortName: vi.fn().mockResolvedValue(false),
    };

    seasons = {
      findById: vi.fn().mockResolvedValue(season),

      findCurrent: vi.fn().mockResolvedValue(season),
    };

    service = createTeamsService(
      teams as unknown as TeamRepository,
      seasons as unknown as SeasonRepository,
    );
  });

  it('inscribe el equipo en estado PENDIENTE_VALIDACION usando la temporada vigente', async () => {
    const team = await service.register(captain, dto, insideWindow);

    expect(team.status).toBe(TeamState.PENDIENTE_VALIDACION);

    expect(teams.create).toHaveBeenCalledWith({
      seasonId: 'season-1',
      captainId: 'captain-1',
      name: 'Tigres del Norte',
      shortName: 'TDN',
      players: dto.players.map((player) => ({
        name: player.name,
        dui: player.dui,
        birthDate: new Date(`${player.birthDate}T00:00:00.000Z`),
        position: player.position,
        jerseyNumber: player.jerseyNumber,
      })),
    });
  });

  it('usa la temporada indicada cuando viene seasonId', async () => {
    await service.register(
      captain,
      { ...dto, seasonId: 'season-1' },
      insideWindow,
    );

    expect(seasons.findById).toHaveBeenCalledWith('season-1');

    expect(seasons.findCurrent).not.toHaveBeenCalled();
  });

  it('responde 404 si no hay temporada', async () => {
    seasons.findCurrent.mockResolvedValue(null);

    await expect(
      service.register(captain, dto, insideWindow),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['antes de abrir', new Date('2026-10-31T23:59:59')],
    ['después de cerrar', new Date('2026-11-16T00:00:00')],
  ])(
    'rechaza con 409 si el período de inscripciones está cerrado (%s)',
    async (_label, now) => {
      await expect(
        service.register(captain, dto, now),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(teams.create).not.toHaveBeenCalled();
    },
  );

  it('acepta el último instante del período (fechas inclusivas)', async () => {
    await expect(
      service.register(
        captain,
        dto,
        new Date('2026-11-15T23:59:59'),
      ),
    ).resolves.toBeDefined();
  });

  it('rechaza con 403 si el capitán ya tiene un equipo en la temporada', async () => {
    teams.findByCaptain.mockResolvedValue({ id: 'team-0' });

    await expect(
      service.register(captain, dto, insideWindow),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(teams.create).not.toHaveBeenCalled();
  });

  it('rechaza con 409 un nombre repetido', async () => {
    teams.existsByName.mockResolvedValue(true);

    await expect(
      service.register(captain, dto, insideWindow),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza con 409 una sigla repetida', async () => {
    teams.existsByShortName.mockResolvedValue(true);

    await expect(
      service.register(captain, dto, insideWindow),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['nombre', new TeamNameTakenError('Tigres'), ConflictException],
    ['sigla', new TeamShortNameTakenError('TDN'), ConflictException],
    [
      'capitán',
      new CaptainAlreadyHasTeamError('captain-1'),
      ForbiddenException,
    ],
  ])(
    'traduce la carrera del insert (%s duplicado) a HTTP',
    async (_label, domainError, httpError) => {
      teams.create.mockRejectedValue(domainError);

      await expect(
        service.register(captain, dto, insideWindow),
      ).rejects.toBeInstanceOf(httpError);
    },
  );

  it('deja pasar los errores inesperados', async () => {
    const boom = new Error('conexión caída');

    teams.create.mockRejectedValue(boom);

    await expect(
      service.register(captain, dto, insideWindow),
    ).rejects.toBe(boom);
  });
});

describe('TeamsService.findMine', () => {
  it('responde 404 si el capitán todavía no inscribió equipo', async () => {
    const service = createTeamsService(
      {
        findByCaptain: vi.fn().mockResolvedValue(null),
      } as unknown as TeamRepository,

      {
        findCurrent: vi.fn().mockResolvedValue(season),
      } as unknown as SeasonRepository,
    );

    await expect(
      service.findMine(captain, insideWindow),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});