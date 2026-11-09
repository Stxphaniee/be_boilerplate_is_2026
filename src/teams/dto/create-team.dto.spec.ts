import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeamDto } from '@Teams/dto';

async function check(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateTeamDto, payload);
  return { dto, errors: await validate(dto) };
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
    expect((await check({ name: 'abc', shortName: 'AB' })).errors).toHaveLength(
      0,
    );
    expect(
      (await check({ name: 'a'.repeat(80), shortName: 'A'.repeat(12) })).errors,
    ).toHaveLength(0);
  });
});
