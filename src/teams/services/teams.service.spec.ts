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

const season = {
  id: 'season-1',
  name: 'Liga Mayor Amateur - Temporada 2026',
  registrationStart: new Date('2026-11-01T00:00:00'),
  registrationEnd: new Date('2026-11-15T23:59:59'),
} as Season;

const captain = { id: 'captain-1', role: 'CAPITAN' } as User;
const dto = { name: 'Tigres del Norte', shortName: 'TDN' };
const insideWindow = new Date('2026-11-08T12:00:00');

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
    teams = {
      create: vi.fn(
        async (data) =>
          ({ id: 'team-1', status: 'PENDIENTE', ...data }) as Team,
      ),
      findByCaptain: vi.fn().mockResolvedValue(null),
      existsByName: vi.fn().mockResolvedValue(false),
      existsByShortName: vi.fn().mockResolvedValue(false),
    };
    seasons = {
      findById: vi.fn().mockResolvedValue(season),
      findCurrent: vi.fn().mockResolvedValue(season),
    };
    service = new TeamsService(
      teams as unknown as TeamRepository,
      seasons as unknown as SeasonRepository,
    );
  });

  it('inscribe el equipo en estado PENDIENTE usando la temporada vigente', async () => {
    const team = await service.register(captain, dto, insideWindow);

    expect(team.status).toBe('PENDIENTE');
    expect(teams.create).toHaveBeenCalledWith({
      seasonId: 'season-1',
      captainId: 'captain-1',
      name: 'Tigres del Norte',
      shortName: 'TDN',
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
      await expect(service.register(captain, dto, now)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(teams.create).not.toHaveBeenCalled();
    },
  );

  it('acepta el último instante del período (fechas inclusivas)', async () => {
    await expect(
      service.register(captain, dto, new Date('2026-11-15T23:59:59')),
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
    await expect(service.register(captain, dto, insideWindow)).rejects.toBe(
      boom,
    );
  });
});

describe('TeamsService.findMine', () => {
  it('responde 404 si el capitán todavía no inscribió equipo', async () => {
    const service = new TeamsService(
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
