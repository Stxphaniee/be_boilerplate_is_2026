import { Module } from '@nestjs/common';
import { PaymentRepository } from './repositories/payment.repository.js';
import { PaymentsService } from './services/payments.service.js';

@Module({
  providers: [PaymentRepository, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}