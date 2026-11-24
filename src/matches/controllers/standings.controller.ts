import {
  Controller,
  Get,
  Patch,
  Put,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@Auth/decorators';
import { StandingsService } from '../services/standings.service.js';
import { StandingsResponseDto } from '../dto/standings.dto.js';

@ApiTags('standings')
@Controller('tabla-posiciones')
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get()
  @Public()
  @ApiOperation({
feature/HU11-Tabla-Posiciones
    summary: 'Consulta pública de la tabla de posiciones general (H11)',

    summary: 'Consulta pública de la tabla de posiciones calculada automáticamente (H10/H11)',
develop
  })
  @ApiOkResponse({ type: StandingsResponseDto })
  @ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
  async getStandings(): Promise<StandingsResponseDto> {
    return this.standingsService.calculateStandings();
  }

  @Patch()
  @ApiOperation({
feature/HU11-Tabla-Posiciones
    summary: 'Rechaza la edición manual de puntos o estadísticas de la tabla',

    summary: 'Rechaza la edición manual de puntos o estadísticas de la tabla (H10)',
develop
  })
  @ApiForbiddenResponse({
    description: 'No se permite alterar o manipular manualmente los puntos o valores de la tabla.',
  })
  rejectPatch(): never {
    return this.standingsService.rejectManualUpdate();
  }

  @Put()
  @ApiOperation({
 feature/HU11-Tabla-Posiciones
    summary: 'Rechaza la edición manual de puntos o estadísticas de la tabla',

    summary: 'Rechaza la edición manual de puntos o estadísticas de la tabla (H10)',
develop
  })
  @ApiForbiddenResponse({
    description: 'No se permite alterar o manipular manualmente los puntos o valores de la tabla.',
  })
  rejectPut(): never {
    return this.standingsService.rejectManualUpdate();
  }
}
