import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@Auth/decorators';
import { Role, type User } from '@PrismaClient';
import {
  MatchCorrectionsService,
  type CorrectMatchInput,
} from './match-corrections.service.js';

@ApiTags('matches')
@ApiBearerAuth()
@Controller()
export class MatchCorrectionsController {
  constructor(private readonly service: MatchCorrectionsService) {}

  @Post('partidos/:id/corregir')
  @Roles(Role.ORGANIZADOR)
  correctResult(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: CorrectMatchInput,
  ) {
    return this.service.correctMatchResult(id, user, body);
  }
}