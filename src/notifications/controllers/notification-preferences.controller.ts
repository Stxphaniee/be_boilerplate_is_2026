import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import {
  NotificationPreferencesResponseDto,
  UpdateNotificationPreferencesDto,
} from '../dto/notification-preferences.dto.js';
import { NotificationPreferencesService } from '../services/notification-preferences.service.js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get(['usuarios/preferencias-notificaciones', 'api/usuarios/preferencias-notificaciones'])
  @ApiOperation({
    summary: 'Consulta las preferencias de notificación del usuario autenticado (HU21)',
  })
  @ApiOkResponse({ type: NotificationPreferencesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  getPreferences(@CurrentUser() user: User): Promise<NotificationPreferencesResponseDto> {
    return this.preferencesService.getPreferences(user.id);
  }

  @Patch(['usuarios/preferencias-notificaciones', 'api/usuarios/preferencias-notificaciones'])
  @ApiOperation({
    summary: 'Actualiza las preferencias de notificación del usuario autenticado (HU21)',
  })
  @ApiOkResponse({ type: NotificationPreferencesResponseDto })
  @ApiBadRequestResponse({ description: 'Campos o tipos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Falta el token o es inválido.' })
  updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.preferencesService.updatePreferences(user.id, dto);
  }
}
