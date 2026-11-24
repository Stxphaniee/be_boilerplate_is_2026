import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@Auth/decorators';
import { Role, type User } from '@PrismaClient';
import {
  RegistrationPaymentsService,
  type ProcessPaymentInput,
} from './registration-payments.service.js';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('pagos')
export class RegistrationPaymentsController {
  constructor(private readonly service: RegistrationPaymentsService) {}

  @Post()
  @Roles(Role.CAPITAN)
  payRegistration(
    @CurrentUser() user: User,
    @Body() body: ProcessPaymentInput,
  ) {
    return this.service.processRegistrationPayment(user, body);
  }
}