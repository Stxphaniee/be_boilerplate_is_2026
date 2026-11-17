
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateTeamDto } from '@Teams/dto';
import { Position } from '@PrismaClient';

// Plantilla válida para las pruebas de CreateTeamDto.
const validPlayers = [
  {
    name: 'Carlos Alberto Ruiz',
    dui: '01234567-8',
    birthDate: '2000-01-15',
    position: Position.PORTERO,
    jerseyNumber: 1,
  },
  {
    name: 'José Martínez López',
    dui: '12345678-9',
    birthDate: '2001-02-20',
    position: Position.DEFENSA,
    jerseyNumber: 2,
  },
  {
    name: 'Miguel Ángel Torres',
    dui: '23456789-0',
    birthDate: '1999-03-10',
    position: Position.MEDIOCAMPISTA,
    jerseyNumber: 3,
  },
  {
    name: 'Roberto Hernández',
    dui: '34567890-1',
    birthDate: '2002-04-05',
    position: Position.DELANTERO,
    jerseyNumber: 4,
  },
  {
    name: 'Daniel Alexander Flores',
    dui: '45678901-2',
    birthDate: '2000-05-12',
    position: Position.DEFENSA,
    jerseyNumber: 5,
  },
];

async function check(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateTeamDto, {
    players: validPlayers,
    ...payload,
  });

  return {
    dto,
    errors: await validate(dto),
  };
}

describe('CreateTeamDto', () => {
  it('normaliza espacios en el nombre y pasa la sigla a mayúsculas', async () => {
    const { dto, errors } = await check({
      name: '  Tigres   del  Norte ',
      shortName: ' tdn ',
    });

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Tigres del Norte');
    expect(dto.shortName).toBe('TDN');
    expect(dto.players).toHaveLength(5);
  });

  it.each([
    ['nombre de 2 caracteres', { name: 'ab', shortName: 'TDN' }],
    ['nombre de 81 caracteres', { name: 'a'.repeat(81), shortName: 'TDN' }],
    ['nombre solo con espacios', { name: '    ', shortName: 'TDN' }],
    ['sigla de 1 carácter', { name: 'Tigres', shortName: 'T' }],
    ['sigla de 13 caracteres', { name: 'Tigres', shortName: 'A'.repeat(13) }],
    ['sigla ausente', { name: 'Tigres' }],
    [
      'seasonId que no es UUID',
      { name: 'Tigres', shortName: 'TDN', seasonId: '123' },
    ],
  ])('rechaza %s', async (_label, payload) => {
    const { errors } = await check(payload);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('acepta los límites exactos (nombre 3 y 80, sigla 2 y 12)', async () => {
    expect(
      (await check({ name: 'abc', shortName: 'AB' })).errors,
    ).toHaveLength(0);

    expect(
      (
        await check({
          name: 'a'.repeat(80),
          shortName: 'A'.repeat(12),
        })
      ).errors,
    ).toHaveLength(0);
  });

  it('rechaza un equipo sin jugadores', async () => {
    const { errors } = await check({
      name: 'Tigres',
      shortName: 'TDN',
      players: [],
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza un equipo con menos de 5 jugadores', async () => {
    const { errors } = await check({
      name: 'Tigres',
      shortName: 'TDN',
      players: validPlayers.slice(0, 4),
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza un equipo con más de 15 jugadores', async () => {
    const { errors } = await check({
      name: 'Tigres',
      shortName: 'TDN',
      players: Array.from({ length: 16 }, (_, index) => ({
        ...validPlayers[index % 5],
        jerseyNumber: index + 1,
      })),
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
