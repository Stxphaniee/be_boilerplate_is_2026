import { Controller, Get, Patch, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@Auth/decorators';
import { StandingsService } from './standings.service.js';

@ApiTags('standings')
@Controller('tabla-posiciones')
export class StandingsController {
  constructor(private readonly service: StandingsService) {}

  @Public()
  @Get()
  getStandings() {
    return this.service.getStandings();
  }

  @Patch()
  rejectPatch() {
    return this.service.rejectManualEdit();
  }

  @Put()
  rejectPut() {
    return this.service.rejectManualEdit();
  }
}