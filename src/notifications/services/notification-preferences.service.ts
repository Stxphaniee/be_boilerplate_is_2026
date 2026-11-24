import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationCategory } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';
import type {
  NotificationPreferencesResponseDto,
  UpdateNotificationPreferencesDto,
} from '../dto/notification-preferences.dto.js';

const CATEGORY_TO_KEY: Record<NotificationCategory, keyof NotificationPreferencesResponseDto> = {
  [NotificationCategory.PAGOS]: 'pagos',
  [NotificationCategory.CALENDARIO]: 'calendario',
  [NotificationCategory.RESULTADOS]: 'resultados',
  [NotificationCategory.INSCRIPCIONES]: 'inscripciones',
};

const KEY_TO_CATEGORY: Record<keyof NotificationPreferencesResponseDto, NotificationCategory> = {
  pagos: NotificationCategory.PAGOS,
  calendario: NotificationCategory.CALENDARIO,
  resultados: NotificationCategory.RESULTADOS,
  inscripciones: NotificationCategory.INSCRIPCIONES,
};

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    const rows = await this.prisma.preferenciaNotificacion.findMany({
      where: { userId },
    });

    const result: NotificationPreferencesResponseDto = {
      pagos: true,
      calendario: true,
      resultados: true,
      inscripciones: true,
    };

    for (const row of rows) {
      const key = CATEGORY_TO_KEY[row.categoria];
      if (key) {
        result[key] = row.activa;
      }
    }

    return result;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    const allowedKeys = Object.keys(KEY_TO_CATEGORY) as Array<
      keyof NotificationPreferencesResponseDto
    >;

    const rawEntries = Object.entries(dto ?? {});
    for (const [key, value] of rawEntries) {
      if (!allowedKeys.includes(key as keyof NotificationPreferencesResponseDto)) {
        throw new BadRequestException(`Campo de preferencia inválido: ${key}`);
      }
      if (value !== undefined && typeof value !== 'boolean') {
        throw new BadRequestException(`El campo "${key}" debe ser booleano.`);
      }
    }

    const updates = allowedKeys
      .filter((key) => dto[key] !== undefined)
      .map((key) => ({
        categoria: KEY_TO_CATEGORY[key],
        activa: dto[key] as boolean,
      }));

    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map((item) =>
          this.prisma.preferenciaNotificacion.upsert({
            where: {
              userId_categoria: {
                userId,
                categoria: item.categoria,
              },
            },
            create: {
              userId,
              categoria: item.categoria,
              activa: item.activa,
            },
            update: {
              activa: item.activa,
            },
          }),
        ),
      );
    }

    return this.getPreferences(userId);
  }
}
