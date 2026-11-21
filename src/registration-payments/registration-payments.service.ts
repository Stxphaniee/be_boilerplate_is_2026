import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationCategory,
  NotificationSourceModule,
  PaymentState,
  TeamState,
  type User,
} from '@PrismaClient';
import { PrismaService } from '@Prisma/services';

export interface ProcessPaymentInput {
  ultimos4?: string;
  titular?: string;
  expiracion?: string;
  monto?: number;
}

@Injectable()
export class RegistrationPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processRegistrationPayment(captain: User, body: ProcessPaymentInput) {
    const ultimos4 = String(body.ultimos4 ?? '').trim();
    if (!/^\d{4}$/.test(ultimos4)) {
      throw new BadRequestException(
        'Debes enviar únicamente los últimos 4 dígitos de la tarjeta.',
      );
    }

    if (ultimos4 === '0002') {
      throw new BadRequestException('Fondos insuficientes');
    }

    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    if (!season) {
      throw new NotFoundException('No existe una temporada activa.');
    }

    const team = await this.prisma.team.findFirst({
      where: { seasonId: season.id, captainId: captain.id },
      include: { payments: true },
    });

    if (!team) {
      throw new NotFoundException(
        'No tienes un equipo registrado en la temporada activa.',
      );
    }

    if (
      team.status !== TeamState.APROBADO &&
      team.status !== TeamState.SUSPENDIDO
    ) {
      throw new ConflictException(
        'Solo los equipos APROBADOS o SUSPENDIDOS pueden pagar la cuota.',
      );
    }

    const payment = team.payments[0];
    if (!payment) {
      throw new NotFoundException('No existe una cuota pendiente para tu equipo.');
    }

    if (payment.status === PaymentState.PAGADO) {
      throw new ConflictException('La cuota de inscripción ya fue pagada.');
    }

    const paidAt = new Date();
    const updated = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: [PaymentState.PENDIENTE, PaymentState.VENCIDO] },
      },
      data: {
        status: PaymentState.PAGADO,
        paidAt,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException('La cuota de inscripción ya fue pagada.');
    }

    const comprobanteId = `COMP-${randomUUID().slice(0, 8).toUpperCase()}`;

    await this.prisma.notification
      .create({
        data: {
          userId: captain.id,
          title: 'Pago confirmado',
          message: `Se confirmó el pago de $${Number(payment.amount).toFixed(2)} para ${team.name}. Comprobante: ${comprobanteId}.`,
          category: NotificationCategory.PAGOS,
          sourceModule: NotificationSourceModule.PAGOS,
          reference: payment.id,
          eventId: `pago-confirmado:${payment.id}`,
          isCritical: false,
        },
      })
      .catch(() => null);

    return {
      pagoId: payment.id,
      comprobanteId,
      ultimos4,
      monto: Number(payment.amount),
      estado: PaymentState.PAGADO,
      fechaPago: paidAt.toISOString(),
      equipoNombre: team.name,
    };
  }
}