import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@PrismaClient';
import { NotificacionService } from './notificacion.service.js';
import { BandejaService } from '../controllers/notificaciones.controller.js';

const base = {
  destinatarioId: 'u1',
  categoria: 'CALENDARIO',
  moduloOrigen: 'CALENDARIO',
  titulo: 'Aviso',
  mensaje: 'Mensaje',
  eventoId: 'ev-1',
} as const;

function makePrisma() {
  return {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1' }) },
    notification: {
      create: vi.fn().mockImplementation(({ data }) => ({ id: 'n1', ...data })),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
  };
}

describe('HU20 NotificacionService', () => {
  it('persiste un aviso valido', async () => {
    const prisma = makePrisma();
    const svc = new NotificacionService(prisma as never);
    const n = await svc.crearAviso({ ...base });
    expect(n).not.toBeNull();
    expect(prisma.notification.create).toHaveBeenCalledOnce();
  });

  it('omite duplicados por (eventoId, usuario)', async () => {
    const prisma = makePrisma();
    prisma.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002', clientVersion: 'x',
      }),
    );
    const svc = new NotificacionService(prisma as never);
    await expect(svc.crearAviso({ ...base })).resolves.toBeNull();
  });

  it('valida longitudes y eventoId', async () => {
    const svc = new NotificacionService(makePrisma() as never);
    await expect(svc.crearAviso({ ...base, titulo: 'x'.repeat(101), eventoId: '' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('deduplica destinatarios en la firma HU20 de crearAvisos', async () => {
    const prisma = makePrisma();
    const svc = new NotificacionService(prisma as never);
    const { destinatarioId: _omit, ...rest } = base;
    const creados = await svc.crearAvisos({ ...rest, destinatarios: ['u1', 'u1', 'u2'] });
    expect(creados).toHaveLength(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });
});

describe('HU20 BandejaService', () => {
  it('rechaza paginacion invalida', () => {
    const svc = new BandejaService(makePrisma() as never);
    expect(() => svc.parseQuery('0', '10')).toThrow(BadRequestException);
    expect(() => svc.parseQuery('1', '10', 'otro')).toThrow(BadRequestException);
    expect(svc.parseQuery(undefined, undefined, 'no_leida')).toEqual({
      page: 1, limit: 10, estado: 'NO_LEIDA',
    });
  });

  it('no permite marcar notificaciones ajenas', async () => {
    const prisma = makePrisma();
    prisma.notification.findFirst.mockResolvedValue(null);
    const svc = new BandejaService(prisma as never);
    await expect(svc.marcarLeida('u2', 'n1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u2' },
    });
  });
});
