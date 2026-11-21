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
import { Public } from '../../auth/decorators/index.js';
import { StandingsService } from '../services/standings.service.js';
import { StandingsResponseDto } from '../dto/standings.dto.js';

@ApiTags('standings')
@Controller('tabla-posiciones')
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Consulta pública de la tabla de posiciones calculada automáticamente (H10/H11)',
  })
  @ApiOkResponse({ type: StandingsResponseDto })
  @ApiInternalServerErrorResponse({ description: 'Error interno del servidor.' })
  async getStandings(): Promise<StandingsResponseDto> {
    return this.standingsService.calculateStandings();
  }

  @Patch()
  @ApiOperation({
    summary: 'Rechaza la edición manual de puntos o estadísticas de la tabla (H10)',
  })
  @ApiForbiddenResponse({
    description: 'No se permite alterar o manipular manualmente los puntos o valores de la tabla.',
  })
  rejectPatch(): never {
    return this.standingsService.rejectManualUpdate();
  }

  @Put()
  @ApiOperation({
    summary: 'Rechaza la edición manual de puntos o estadísticas de la tabla (H10)',
  })
  @ApiForbiddenResponse({
    description: 'No se permite alterar o manipular manualmente los puntos o valores de la tabla.',
  })
  rejectPut(): never {
    return this.standingsService.rejectManualUpdate();
  }
}
