import { Module } from '@nestjs/common';
import { PrismaModule } from '@Prisma';
import { AdminPaymentsController } from './admin-payments.controller.js';
import { AdminPaymentsService } from './admin-payments.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
})
export class AdminPaymentsModule {}