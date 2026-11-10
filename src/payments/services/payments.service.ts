
import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
  ) {}


  calculateDueDate(
    approvedAt: Date = new Date(),
  ): Date {
    const dueDate = new Date(approvedAt);

    dueDate.setUTCDate(
      dueDate.getUTCDate() + 15,
    );

    return dueDate;
  }

  async createRegistrationPayment(
    teamId: string,
    amount: string,
    approvedAt: Date = new Date(),
  ) {
    const existing =
      await this.paymentRepository.findByTeam(teamId);

    if (existing) {
      return existing;
    }

    const dueDate = this.calculateDueDate(approvedAt);

    return this.paymentRepository.createPending(
      teamId,
      amount,
      dueDate,
    );
  }
}
