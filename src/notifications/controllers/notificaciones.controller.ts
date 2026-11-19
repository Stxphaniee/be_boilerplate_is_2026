import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import { PrismaService } from '@Prisma/services';
import { NotificationState, type Notification, type User } from '@PrismaClient';

export interface NotificacionDto {
  id: string;
  titulo: string;
  mensaje: string;
  categoria: string | null;
  moduloOrigen: string | null;
  referencia: string | null;
  estado: NotificationState;
  esCritica: boolean;
  createdAt: Date;
  leidaAt: Date | null;
}

export interface BandejaDto {
  items: NotificacionDto[];
  page: number;
  limit: number;
  total: number;
  noLeidas: number;
}

export function toNotificacionDto(n: Notification): NotificacionDto {
  return {
    id: n.id,
    titulo: n.title,
    mensaje: n.message,
    categoria: n.category,
    moduloOrigen: n.sourceModule,
    referencia: n.reference,
    estado: n.status,
    esCritica: n.isCritical,
    createdAt: n.createdAt,
    leidaAt: n.readAt,
  };
}

const ESTADOS: Record<string, NotificationState> = {
  leida: NotificationState.LEIDA,
  no_leida: NotificationState.NO_LEIDA,
};

/** HU20 - Bandeja de entrada del usuario autenticado. */
@Injectable()
export class BandejaService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(page?: string, limit?: string, estado?: string) {
    const p = page === undefined ? 1 : Number(page);
    const l = limit === undefined ? 10 : Number(limit);
    if (!Number.isInteger(p) || p < 1 || !Number.isInteger(l) || l < 1 || l > 50) {
      throw new BadRequestException('Paginación inválida.');
    }
    if (estado !== undefined && !(estado in ESTADOS)) {
      throw new BadRequestException('El estado debe ser leida o no_leida.');
    }
    return { page: p, limit: l, estado: estado ? ESTADOS[estado] : undefined };
  }

  async listar(
    userId: string,
    page: number,
    limit: number,
    estado?: NotificationState,
  ): Promise<BandejaDto> {
    const where = { userId, ...(estado ? { status: estado } : {}) };
    const [items, total, noLeidas] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, status: NotificationState.NO_LEIDA },
      }),
    ]);
    return { items: items.map(toNotificacionDto), page, limit, total, noLeidas };
  }

  async marcarLeida(userId: string, id: string): Promise<NotificacionDto> {
    // Se filtra por dueño: una notificación ajena responde igual que una inexistente.
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('La notificación no existe.');
    if (n.status === NotificationState.LEIDA) return toNotificacionDto(n);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationState.LEIDA, readAt: new Date() },
    });
    return toNotificacionDto(updated);
  }

  async marcarTodas(userId: string): Promise<{ actualizadas: number; noLeidas: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, status: NotificationState.NO_LEIDA },
      data: { status: NotificationState.LEIDA, readAt: new Date() },
    });
    return { actualizadas: count, noLeidas: 0 };
  }
}

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly bandeja: BandejaService) {}

  @Get()
  @ApiOperation({ summary: 'Bandeja paginada del usuario autenticado (HU20)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'estado', required: false, enum: ['leida', 'no_leida'] })
  listar(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: string,
  ): Promise<BandejaDto> {
    const q = this.bandeja.parseQuery(page, limit, estado);
    return this.bandeja.listar(user.id, q.page, q.limit, q.estado);
  }

  // Debe declararse antes de ':id/leer'.
  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marca todas las notificaciones como leídas (HU20)' })
  marcarTodas(@CurrentUser() user: User) {
    return this.bandeja.marcarTodas(user.id);
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marca una notificación propia como leída (HU20)' })
  marcarLeida(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificacionDto> {
    return this.bandeja.marcarLeida(user.id, id);
  }
}
