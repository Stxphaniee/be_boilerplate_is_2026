
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/index.js';
import { PaymentState } from '../../generated/prisma/client.js';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTeam(teamId: string) {
    return this.prisma.payment.findUnique({
      where: { teamId },
    });
  }

  async createPending(
    teamId: string,
    amount: string,
    dueDate: Date,
  ) {
    return this.prisma.payment.create({
      data: {
        teamId,
        amount,
        dueDate,
        status: PaymentState.PENDIENTE,
      },
    });
  }
}
