import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/services/index.js';
import { MatchEventType, MatchState } from '../../generated/prisma/client.js';
import { CorregirResultadoDto, MatchCorrectionDetailDto } from '../dto/match-correction.dto.js';

@Injectable()
export class MatchCorrectionService {
  constructor(private readonly prisma: PrismaService) {}

  async getCorrectionDetail(matchId: string): Promise<MatchCorrectionDetailDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: true,
        homeTeam: {
          include: {
            players: {
              where: { leftAt: null },
              orderBy: { jerseyNumber: 'asc' },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              where: { leftAt: null },
              orderBy: { jerseyNumber: 'asc' },
            },
          },
        },
        events: {
          where: { type: MatchEventType.GOL },
          include: {
            player: {
              include: { team: true },
            },
          },
          orderBy: { minute: 'asc' },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Partido no encontrado.');
    }

    if (match.state !== MatchState.FINALIZADO) {
      throw new ConflictException(
        'Solo se pueden corregir partidos en estado FINALIZADO.',
      );
    }

    let homeScore = 0;
    let awayScore = 0;

    const editableEvents = match.events.map((ev) => {
      const isHome = ev.player.teamId === match.homeTeamId;
      if (isHome) homeScore++;
      else awayScore++;

      return {
        id: ev.id,
        minute: ev.minute,
        playerId: ev.playerId,
        playerName: ev.player.name,
        teamId: ev.player.teamId,
        teamName: ev.player.team.name,
        type: ev.type,
      };
    });

    const roster = [
      ...match.homeTeam.players.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        teamId: match.homeTeamId,
        teamName: match.homeTeam.name,
      })),
      ...match.awayTeam.players.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
        teamId: match.awayTeamId,
        teamName: match.awayTeam.name,
      })),
    ];

    return {
      id: match.id,
      jornadaNumero: match.round.numero,
      homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name },
      awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name },
      homeScore,
      awayScore,
      state: match.state,
      editableEvents,
      roster,
    };
  }

  async correctMatchResult(
    matchId: string,
    organizerId: string,
    dto: CorregirResultadoDto,
  ) {
    const justificacion = dto.justificacion?.trim();
    if (!justificacion) {
      throw new BadRequestException('La justificación es obligatoria.');
    }
    if (justificacion.length > 300) {
      throw new BadRequestException(
        'La justificación no puede exceder los 300 caracteres.',
      );
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: { players: true },
        },
        awayTeam: {
          include: { players: true },
        },
        events: {
          where: { type: MatchEventType.GOL },
          include: { player: true },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Partido no encontrado.');
    }

    if (match.state !== MatchState.FINALIZADO) {
      throw new ConflictException(
        'Solo se pueden corregir resultados de partidos FINALIZADOS.',
      );
    }

    const homePlayerIds = new Set(match.homeTeam.players.map((p) => p.id));
    const awayPlayerIds = new Set(match.awayTeam.players.map((p) => p.id));

    // Validar eventos corregidos
    for (const ev of dto.eventosCorregidos || []) {
      if (!homePlayerIds.has(ev.playerId) && !awayPlayerIds.has(ev.playerId)) {
        throw new BadRequestException(
          `El jugador con ID ${ev.playerId} no pertenece a los equipos participantes del partido.`,
        );
      }
      if (ev.minute < 0 || ev.minute > 120) {
        throw new BadRequestException(
          `Minuto inválido (${ev.minute}). Debe ser entre 0 y 120.`,
        );
      }
    }

    // Ejecutar la corrección con auditoría en una transacción atómica
    return this.prisma.$transaction(async (tx) => {
      // 1. Snapshot de eventos antes
      const eventosAntes = match.events.map((ev) => ({
        id: ev.id,
        playerId: ev.playerId,
        playerName: ev.player?.name,
        minute: ev.minute,
        type: ev.type,
      }));

      // 2. Eliminar eventos de gol existentes y asistencias asociadas
      await tx.matchEvent.deleteMany({
        where: {
          matchId,
          type: { in: [MatchEventType.GOL, MatchEventType.ASISTENCIA] },
        },
      });

      // 3. Crear los nuevos eventos de gol corregidos
      const nuevosEventos = [];
      let homeScore = 0;
      let awayScore = 0;

      for (const ev of dto.eventosCorregidos || []) {
        const created = await tx.matchEvent.create({
          data: {
            matchId,
            playerId: ev.playerId,
            minute: ev.minute,
            type: MatchEventType.GOL,
          },
          include: { player: true },
        });

        if (homePlayerIds.has(ev.playerId)) {
          homeScore++;
        } else {
          awayScore++;
        }

        nuevosEventos.push({
          id: created.id,
          playerId: created.playerId,
          playerName: created.player?.name,
          minute: created.minute,
          type: created.type,
        });
      }

      // 4. Registrar auditoría obligatoria
      const audit = await tx.auditoriaResultado.create({
        data: {
          partidoId: matchId,
          organizadorId: organizerId,
          eventosAntes,
          eventosDespues: nuevosEventos,
          justificacion,
        },
      });

      return {
        matchId,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeScore,
        awayScore,
        justificacion,
        auditoriaId: audit.id,
        createdAt: audit.createdAt,
        eventosCorregidos: nuevosEventos,
      };
    });
  }
}
