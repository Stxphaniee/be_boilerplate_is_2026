import { Module } from '@nestjs/common';
import { PrismaModule } from '@Prisma';
import { RegistrationPaymentsController } from './registration-payments.controller.js';
import { RegistrationPaymentsService } from './registration-payments.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RegistrationPaymentsController],
  providers: [RegistrationPaymentsService],
})
export class RegistrationPaymentsModule {}