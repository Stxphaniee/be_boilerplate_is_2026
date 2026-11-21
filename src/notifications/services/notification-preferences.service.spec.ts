import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { NotificationCategory } from '@PrismaClient';
import { NotificationPreferencesService } from './notification-preferences.service.js';

describe('NotificationPreferencesService (HU21)', () => {
  it('devuelve todas las categorías activas por defecto cuando no existen registros', async () => {
    const prisma = {
      preferenciaNotificacion: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const service = new NotificationPreferencesService(prisma as never);

    await expect(service.getPreferences('u1')).resolves.toEqual({
      pagos: true,
      calendario: true,
      resultados: true,
      inscripciones: true,
    });
  });

  it('persiste cambios de categorías y devuelve la configuración actualizada', async () => {
    const prisma = {
      preferenciaNotificacion: {
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([
          { categoria: NotificationCategory.PAGOS, activa: false },
          { categoria: NotificationCategory.RESULTADOS, activa: false },
        ]),
      },
      $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
    };
    const service = new NotificationPreferencesService(prisma as never);

    const res = await service.updatePreferences('u1', {
      pagos: false,
      resultados: false,
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(res).toEqual({
      pagos: false,
      calendario: true,
      resultados: false,
      inscripciones: true,
    });
  });

  it('rechaza con 400 valores no booleanos o campos desconocidos', async () => {
    const prisma = {
      preferenciaNotificacion: { findMany: vi.fn() },
    };
    const service = new NotificationPreferencesService(prisma as never);

    await expect(
      service.updatePreferences('u1', { pagos: 'no' as unknown as boolean }),
    ).rejects.toThrow(BadRequestException);
  });
});
