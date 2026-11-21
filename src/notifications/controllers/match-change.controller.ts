import { Controller, Param, Post, Body, ParseIntPipe } from '@nestjs/common';
import { MatchChangeService } from '../services/match-change.service.js';

/**
 * Controller for triggering match change notifications (HU16).
 * Exposes POST /partidos/:id/notificar-cambio with payload { change: string, userId: number }.
 */
@Controller('partidos')
export class MatchChangeController {
  constructor(private readonly matchChangeService: MatchChangeService) {}

  @Post(':id/notificar-cambio')
  async notifyChange(
    @Param('id', ParseIntPipe) matchId: string,
    @Body() body: { change: string; userId: string },
  ) {
    const { change, userId } = body;
    return this.matchChangeService.notifyMatchChange(matchId, change, userId);
  }
}
