import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { NotificacionService } from './notificacion.service.js';
import { NotificationsService } from './notifications.service.js';

function makeNotificacion(createImpl?: (args: unknown) => unknown) {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1' }) },
    notification: {
      create: vi.fn(createImpl ?? (async (args: any) => ({ id: 'n', ...args.data }))),
    },
  };
  return { prisma, service: new NotificacionService(prisma as never) };
}

const base = {
  destinatarioId: 'u1',
  categoria: 'CALENDARIO',
  moduloOrigen: 'CALENDARIO',
  titulo: 'Jornada publicada',
  mensaje: 'Hola',
  eventoId: 'jornada-publicada:r1',
} as const;

describe('NotificacionService.crearAviso (HU17/H20)', () => {
  it('persiste el aviso con el contrato completo', async () => {
    const { prisma, service } = makeNotificacion();
    const aviso = await service.crearAviso({ ...base, referencia: 'r1' });

    expect(aviso).toMatchObject({ userId: 'u1', eventId: 'jornada-publicada:r1', reference: 'r1', isCritical: false });
    expect(prisma.notification.create).toHaveBeenCalledOnce();
  });

  it('devuelve null si ya existe un aviso para (eventoId, usuario)', async () => {
    const dup = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
    const { service } = makeNotificacion(async () => { throw dup; });

    await expect(service.crearAviso({ ...base })).resolves.toBeNull();
  });

  it('relanza errores que no son duplicados', async () => {
    const { service } = makeNotificacion(async () => { throw new Error('db caída'); });
    await expect(service.crearAviso({ ...base })).rejects.toThrow('db caída');
  });

  it('rechaza destinatario inexistente con 404', async () => {
    const { prisma, service } = makeNotificacion();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.crearAviso({ ...base })).rejects.toMatchObject({ status: 404 });
  });

  it.each([
    ['título vacío', { titulo: '' }],
    ['título > 100', { titulo: 'x'.repeat(101) }],
    ['mensaje > 500', { mensaje: 'x'.repeat(501) }],
    ['referencia > 100', { referencia: 'x'.repeat(101) }],
    ['eventoId vacío', { eventoId: ' ' }],
    ['categoría inválida', { categoria: 'OTRA' as never }],
  ])('rechaza con 400: %s', async (_n, patch) => {
    const { service } = makeNotificacion();
    await expect(service.crearAviso({ ...base, ...patch })).rejects.toMatchObject({ status: 400 });
  });

  it('crearAvisos deduplica destinatarios repetidos', async () => {
    const { prisma, service } = makeNotificacion();
    const { destinatarioId: _omit, ...rest } = base;
    const creados = await service.crearAvisos(['a', 'a', 'b'], rest);

    expect(creados).toBe(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });
});

describe('NotificationsService.notifyRoundPublished (HU17)', () => {
  const match = (home: string, away: string, referee: string) => ({
    refereeId: referee,
    court: 'A',
    startsAt: new Date('2026-12-01T15:00:00Z'),
    homeTeam: { name: `T-${home}`, captainId: home },
    awayTeam: { name: `T-${away}`, captainId: away },
  });

  function setup(matches: unknown[]) {
    const prisma = { match: { findMany: vi.fn().mockResolvedValue(matches) } };
    const notificacion = {
      crearAvisos: vi.fn().mockResolvedValue(0),
      crearAviso: vi.fn().mockResolvedValue({}),
    };
    return {
      notificacion,
      service: new NotificationsService(prisma as never, notificacion as never),
    };
  }

  it('no emite nada si la jornada no tiene partidos', async () => {
    const { service, notificacion } = setup([]);
    await service.notifyRoundPublished('r1');
    expect(notificacion.crearAvisos).not.toHaveBeenCalled();
    expect(notificacion.crearAviso).not.toHaveBeenCalled();
  });

  it('avisa a capitanes con eventoId por jornada y un aviso por árbitro', async () => {
    const { service, notificacion } = setup([
      match('c1', 'c2', 'ref1'),
      match('c3', 'c4', 'ref1'),
      match('c1', 'c4', 'ref2'),
    ]);

    await service.notifyRoundPublished('r1');

    const [captains, payload] = notificacion.crearAvisos.mock.calls[0];
    expect([...captains].sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(payload).toMatchObject({ eventoId: 'jornada-publicada:r1', referencia: 'r1', categoria: 'CALENDARIO' });

    expect(notificacion.crearAviso).toHaveBeenCalledTimes(2);
    const refereeCall = notificacion.crearAviso.mock.calls.find(([a]) => a.destinatarioId === 'ref1')![0];
    expect(refereeCall.titulo).toBe('Partido asignado');
    expect(refereeCall.eventoId).toBe('partido-asignado:r1');
    expect(refereeCall.mensaje).toContain('T-c1 vs. T-c2');
    expect(refereeCall.mensaje).toContain('T-c3 vs. T-c4');
  });
});
