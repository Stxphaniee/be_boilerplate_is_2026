import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  NotificationCategory,
  NotificationSourceModule,
  PaymentState,
  TeamState,
  type User,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/services/index.js';

export interface SuspensionBody {
  accion?: 'SUSPENDER' | 'REACTIVAR';
  motivo?: string;
}

@Injectable()
export class AdminPaymentsService implements OnModuleInit, OnModuleDestroy {
  private overdueTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.overdueTimer = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 5) {
        void this.markOverduePayments();
      }
    }, 60_000);
    this.overdueTimer.unref();
  }

  onModuleDestroy() {
    if (this.overdueTimer) clearInterval(this.overdueTimer);
  }

  async markOverduePayments() {
    const overdue = await this.prisma.payment.findMany({
      where: {
        status: PaymentState.PENDIENTE,
        dueDate: { lt: new Date() },
      },
      include: { team: true },
    });

    for (const payment of overdue) {
      const updated = await this.prisma.payment.updateMany({
        where: { id: payment.id, status: PaymentState.PENDIENTE },
        data: { status: PaymentState.VENCIDO },
      });

      if (updated.count > 0) {
        await this.prisma.notification
          .create({
            data: {
              userId: payment.team.captainId,
              title: 'Cuota vencida',
              message: `La cuota de inscripción de ${payment.team.name} superó la fecha límite y pasó a estado VENCIDO.`,
              category: NotificationCategory.PAGOS,
              sourceModule: NotificationSourceModule.PAGOS,
              reference: payment.id,
              eventId: `cuota-vencida:${payment.id}`,
              isCritical: false,
            },
          })
          .catch(() => null);
      }
    }

    return { updatedCount: overdue.length };
  }

  async listPayments(estadoRaw?: string) {
    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    if (!season) return { items: [] };

    let statusFilter: PaymentState | undefined;
    if (estadoRaw) {
      const upper = estadoRaw.toUpperCase();
      if (
        upper !== PaymentState.PAGADO &&
        upper !== PaymentState.PENDIENTE &&
        upper !== PaymentState.VENCIDO
      ) {
        throw new BadRequestException(
          'Estado de pago inválido. Usa: PAGADO, PENDIENTE o VENCIDO.',
        );
      }
      statusFilter = upper;
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        team: { seasonId: season.id },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        team: { select: { id: true, name: true, status: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      items: payments.map((p) => ({
        pagoId: p.id,
        equipoId: p.team.id,
        equipoNombre: p.team.name,
        estadoEquipo: p.team.status,
        estadoPago: p.status,
        monto: Number(p.amount),
        fechaVencimiento: p.dueDate.toISOString(),
        fechaPago: p.paidAt ? p.paidAt.toISOString() : null,
      })),
    };
  }

  async updateTeamSuspension(teamId: string, admin: User, body: SuspensionBody) {
    const accion = body.accion;
    const motivo = (body.motivo ?? '').trim();

    if (accion !== 'SUSPENDER' && accion !== 'REACTIVAR') {
      throw new BadRequestException('La acción debe ser SUSPENDER o REACTIVAR.');
    }
    if (!motivo) {
      throw new BadRequestException('El motivo es obligatorio.');
    }

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe.');
    }

    const nextStatus =
      accion === 'SUSPENDER' ? TeamState.SUSPENDIDO : TeamState.APROBADO;

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: { status: nextStatus },
    });

    const isSuspension = accion === 'SUSPENDER';
    await this.prisma.notification
      .create({
        data: {
          userId: team.captainId,
          title: isSuspension ? 'Equipo suspendido' : 'Equipo reactivado',
          message: `${team.name} ha sido ${isSuspension ? 'suspendido' : 'reactivado'}. Motivo: ${motivo}`.slice(0, 500),
          category: NotificationCategory.INSCRIPCIONES,
          sourceModule: NotificationSourceModule.INSCRIPCIONES,
          reference: teamId,
          eventId: `equipo-${accion.toLowerCase()}:${teamId}:${Date.now()}`,
          isCritical: isSuspension,
        },
      })
      .catch(() => null);

    return {
      equipoId: updated.id,
      equipoNombre: updated.name,
      estadoEquipo: updated.status,
      auditoria: {
        realizadoPor: admin.id,
        accion,
        motivo,
        fecha: new Date().toISOString(),
      },
    };
  }
}