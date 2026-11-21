import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import { Role, type User } from '../generated/prisma/client.js';
import {
  AdminPaymentsService,
  type SuspensionBody,
} from './admin-payments.service.js';

@ApiTags('admin-payments')
@ApiBearerAuth()
@Controller('admin')
export class AdminPaymentsController {
  constructor(private readonly service: AdminPaymentsService) {}

  @Get('pagos')
  @Roles(Role.ORGANIZADOR)
  listPayments(@Query('estado') estado?: string) {
    return this.service.listPayments(estado);
  }

  @Patch('equipos/:id/suspension')
  @Roles(Role.ORGANIZADOR)
  updateSuspension(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: SuspensionBody,
  ) {
    return this.service.updateTeamSuspension(id, user, body);
  }
}