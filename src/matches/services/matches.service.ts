import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RoundRepository, MatchRepository } from '@Matches/repositories';
import type { MatchCalendarData } from '@Matches/repositories';
import { SeasonRepository, TeamRepository } from '@Teams/repositories';
import { PrismaService } from '@Prisma/services';
import { NotificationsService } from '../../notifications/services/notifications.service.js';

import type {
  CreateMatchDto,
  CreateRoundDto,
  UpdateMatchDto,
} from '@Matches/dto';

import { UpdateMatchAction } from '@Matches/dto';

import {
  Court,
  MatchState,
  Role,
  RoundState,
  TeamState,
  PaymentState,
} from '@PrismaClient';

import type { Match, Round, User, Team, GalleryImage } from '@PrismaClient';

const MATCH_DURATION_MINUTES = 90;

@Injectable()
export class MatchesService {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly matchRepository: MatchRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly teamRepository: TeamRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =====================================================
  // H4 - JORNADAS
  // =====================================================

  async findAllRounds(): Promise<Round[]> {
    const season = await this.seasonRepository.findCurrent(new Date());

    if (!season) {
      throw new NotFoundException('No hay una temporada activa.');
    }

    return this.roundRepository.findAll(season.id);
  }

  async createRound(dto: CreateRoundDto): Promise<Round> {
    const season = await this.seasonRepository.findCurrent(new Date());

    if (!season) {
      throw new NotFoundException('No hay una temporada activa.');
    }

    if (await this.roundRepository.existsByNumero(season.id, dto.numero)) {
      throw new ConflictException(
        `La jornada ${dto.numero} ya existe en la temporada.`,
      );
    }

    return this.roundRepository.create(season.id, dto.numero);
  }

  async publishRound(roundId: string): Promise<Round> {
    const round = await this.roundRepository.findById(roundId);

    if (!round) {
      throw new NotFoundException('La jornada solicitada no existe.');
    }

    if (round.state !== RoundState.BORRADOR) {
      throw new ConflictException(
        'Solo se pueden publicar jornadas en estado BORRADOR.',
      );
    }

    if (await this.matchRepository.hasSuspendedTeam(roundId)) {
      throw new ConflictException(
        'La jornada contiene partidos con equipos suspendidos. Revísalos antes de publicar.',
      );
    }

    // Transición atómica BORRADOR → PUBLICADA: ante dos publicaciones
    // simultáneas solo una gana y la otra recibe 409 (H17).
    const published = await this.roundRepository.publish(roundId);

    if (!published) {
      throw new ConflictException(
        'Solo se pueden publicar jornadas en estado BORRADOR.',
      );
    }

    await this.notificationsService.notifyRoundPublished(roundId);

    return published;
  }

  // =====================================================
  // H4 - PARTIDOS
  // =====================================================

  async createMatch(
    dto: CreateMatchDto,
    now: Date = new Date(),
  ): Promise<Match> {
    const round = await this.roundRepository.findById(dto.jornadaId);

    if (!round) {
      throw new NotFoundException('La jornada solicitada no existe.');
    }

    if (round.state !== RoundState.BORRADOR) {
      throw new ConflictException(
        'Solo se pueden programar partidos en jornadas BORRADOR.',
      );
    }

    if (dto.equipoLocalId === dto.equipoVisitanteId) {
      throw new BadRequestException(
        'El equipo local y visitante no pueden ser el mismo.',
      );
    }

    const startsAt = new Date(dto.fechaHoraInicio);

    if (isNaN(startsAt.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida.');
    }

    if (startsAt <= now) {
      throw new BadRequestException('La fecha del partido debe ser futura.');
    }

    const endsAt = new Date(
      startsAt.getTime() + MATCH_DURATION_MINUTES * 60_000,
    );

    const referee = await this.findAndValidateReferee(dto.arbitroId);

    await this.validateTeam(dto.equipoLocalId);
    await this.validateTeam(dto.equipoVisitanteId);

    const court = dto.cancha as Court;

    if (await this.matchRepository.hasCourtOverlap(court, startsAt, endsAt)) {
      throw new ConflictException(
        `La cancha ${dto.cancha} ya está ocupada en ese intervalo.`,
      );
    }

    if (
      await this.matchRepository.hasTeamOverlap(
        dto.equipoLocalId,
        dto.equipoVisitanteId,
        startsAt,
        endsAt,
      )
    ) {
      throw new ConflictException(
        'Uno de los equipos ya tiene un partido programado en ese intervalo.',
      );
    }

    if (
      await this.matchRepository.hasDuplicateFixture(
        dto.jornadaId,
        dto.equipoLocalId,
        dto.equipoVisitanteId,
      )
    ) {
      throw new ConflictException(
        'Este enfrentamiento ya está programado en la jornada.',
      );
    }

    return this.matchRepository.create({
      roundId: dto.jornadaId,
      homeTeamId: dto.equipoLocalId,
      awayTeamId: dto.equipoVisitanteId,
      refereeId: referee.id,
      court,
      startsAt,
      endsAt,
    });
  }

  // =====================================================
  // H5 - EDICIÓN, SUSPENSIÓN Y CANCELACIÓN
  // =====================================================

  async updateMatch(
    matchId: string,
    dto: UpdateMatchDto,
    now: Date = new Date(),
  ): Promise<Match> {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundException('El partido solicitado no existe.');
    }

    // Estados que no admiten ninguna modificación.
    const blocked: MatchState[] = [
      MatchState.EN_CURSO,
      MatchState.FINALIZADO,
      MatchState.CANCELADO,
    ];

    if (blocked.includes(match.state)) {
      throw new ConflictException(
        `No se puede modificar un partido en estado ${match.state}.`,
      );
    }

    // Un partido SUSPENDIDO solo admite reprogramación o cancelación.
    if (match.state === MatchState.SUSPENDIDO) {
      const isReprogramacion =
        dto.fechaHoraInicio !== undefined &&
        dto.estado === UpdateMatchAction.PROGRAMADO;

      const isCancelacion = dto.estado === UpdateMatchAction.CANCELADO;

      if (!isReprogramacion && !isCancelacion) {
        throw new ConflictException(
          'Un partido SUSPENDIDO solo puede reprogramarse (enviando nueva fecha y estado PROGRAMADO) o cancelarse.',
        );
      }
    }

    // Suspensión: requiere motivo.
    if (dto.estado === UpdateMatchAction.SUSPENDIDO) {
      if (match.state !== MatchState.PROGRAMADO) {
        throw new ConflictException(
          'Solo se puede suspender un partido PROGRAMADO.',
        );
      }

      if (!dto.motivoSuspension?.trim()) {
        throw new BadRequestException(
          'El motivo de suspensión es obligatorio.',
        );
      }

      return this.matchRepository.update(matchId, {
        state: MatchState.SUSPENDIDO,
        suspensionReason: dto.motivoSuspension.trim(),
      });
    }

    // Cancelación.
    if (dto.estado === UpdateMatchAction.CANCELADO) {
      return this.matchRepository.update(matchId, {
        state: MatchState.CANCELADO,
        suspensionReason: null,
      });
    }

    // Edición de fecha/cancha (PROGRAMADO → PROGRAMADO)
    // o reprogramación (SUSPENDIDO → PROGRAMADO).
    const newStartsAt = dto.fechaHoraInicio
      ? new Date(dto.fechaHoraInicio)
      : match.startsAt;

    if (dto.fechaHoraInicio && isNaN(newStartsAt.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida.');
    }

    if (dto.fechaHoraInicio && newStartsAt <= now) {
      throw new BadRequestException(
        'La nueva fecha del partido debe ser futura.',
      );
    }

    const newEndsAt = new Date(
      newStartsAt.getTime() + MATCH_DURATION_MINUTES * 60_000,
    );

    const newCourt = dto.cancha ? (dto.cancha as Court) : match.court;

    // Revalidar traslapes excluyendo el partido actual.
    if (dto.fechaHoraInicio || dto.cancha) {
      if (
        await this.matchRepository.hasCourtOverlap(
          newCourt,
          newStartsAt,
          newEndsAt,
          matchId,
        )
      ) {
        throw new ConflictException(
          `La cancha ${newCourt} ya está ocupada en ese intervalo.`,
        );
      }

      if (
        await this.matchRepository.hasTeamOverlap(
          match.homeTeamId,
          match.awayTeamId,
          newStartsAt,
          newEndsAt,
          matchId,
        )
      ) {
        throw new ConflictException(
          'Uno de los equipos ya tiene un partido en ese intervalo.',
        );
      }
    }

    return this.matchRepository.update(matchId, {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      court: newCourt,
      state: MatchState.PROGRAMADO,
      suspensionReason: null,
    });
  }

  // =====================================================
  // HU6 - CALENDARIO DEL EQUIPO AUTENTICADO
  // =====================================================

  async findMyMatches(
    user: User,
    now: Date = new Date(),
  ): Promise<{ teamId: string; matches: MatchCalendarData[] }> {
    const season = await this.seasonRepository.findCurrent(now);

    if (!season) {
      throw new NotFoundException('No hay una temporada vigente.');
    }

    let teamId: string | null = null;

    // El capitán consulta primero el equipo que tiene a su cargo en la temporada.
    if (user.role === Role.CAPITAN) {
      const team = await this.teamRepository.findByCaptain(season.id, user.id);
      teamId = team?.id ?? null;
    }

    // Un jugador, o un capitán que también participa como jugador, debe tener
    // su ficha vinculada a la cuenta y continuar activo en la plantilla.
    if (!teamId) {
      // La relación players.user_id se incorpora mediante una migración
      // incremental. La consulta parametrizada evita depender de que el
      // cliente Prisma anterior ya conozca este campo.
      const playerMemberships = await this.prisma.$queryRaw<
        { teamId: string; leftAt: Date | null; seasonId: string }[]
      >`
        SELECT
          p.team_id AS "teamId",
          p.left_at AS "leftAt",
          t.season_id AS "seasonId"
        FROM players p
        INNER JOIN teams t ON t.id = p.team_id
        WHERE p.user_id = ${user.id}::uuid
        LIMIT 1
      `;

      const player = playerMemberships[0] ?? null;

      if (!player) {
        if (user.role === Role.JUGADOR) {
          throw new ForbiddenException(
            'Tu cuenta aún no está vinculada a un jugador.',
          );
        }

        throw new ForbiddenException(
          'No tienes participación activa en ningún equipo.',
        );
      }

      if (player.leftAt !== null || player.seasonId !== season.id) {
        throw new ForbiddenException(
          'No tienes participación activa en ningún equipo.',
        );
      }

      teamId = player.teamId;
    }

    if (!teamId) {
      throw new ForbiddenException(
        'No tienes participación activa en ningún equipo.',
      );
    }

    const matches = await this.matchRepository.findCalendarByTeam(teamId);

    return { teamId, matches };
  }

  // =====================================================
  // CONSULTAS AUXILIARES HU4
  // =====================================================

  async findMatchesByRound(roundId: string): Promise<Match[]> {
    const round = await this.roundRepository.findById(roundId);

    if (!round) {
      throw new NotFoundException('La jornada solicitada no existe.');
    }

    return this.matchRepository.findByRound(roundId);
  }

  async findAvailableTeams(): Promise<Pick<Team, 'id' | 'name'>[]> {
    const season = await this.seasonRepository.findCurrent(new Date());

    if (!season) {
      throw new NotFoundException('No hay una temporada activa.');
    }

    return this.prisma.team.findMany({
      where: {
        seasonId: season.id,
        status: TeamState.APROBADO,
        payments: {
          some: {
            status: PaymentState.PAGADO,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findReferees(): Promise<Pick<User, 'id' | 'email'>[]> {
    return this.prisma.user.findMany({
      where: {
        role: Role.ARBITRO,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        email: 'asc',
      },
    });
  }

  // =====================================================
  // VALIDACIONES PRIVADAS
  // =====================================================

  private async findAndValidateReferee(refereeId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: refereeId },
    });

    if (!user) {
      throw new NotFoundException('El árbitro seleccionado no existe.');
    }

    if (user.role !== Role.ARBITRO) {
      throw new ConflictException(
        'El usuario seleccionado no tiene el rol de árbitro.',
      );
    }

    return user;
  }

  private async validateTeam(teamId: string): Promise<void> {
    const team = await this.teamRepository.findByIdForReview(teamId);

    if (!team) {
      throw new NotFoundException(`El equipo ${teamId} no existe.`);
    }

    if (team.status === TeamState.SUSPENDIDO) {
      throw new ConflictException(
        `El equipo "${team.name}" está suspendido y no puede participar.`,
      );
    }

    if (team.status !== TeamState.APROBADO) {
      throw new ConflictException(`El equipo "${team.name}" no está aprobado.`);
    }

    const payment = team.payments?.[0];

    if (!payment || payment.status !== PaymentState.PAGADO) {
      throw new ConflictException(
        `El equipo "${team.name}" no tiene la cuota de inscripción pagada.`,
      );
    }
  }

  // =====================================================
  // HU18 - SUBIDA DE CONTENIDO MULTIMEDIA DE PARTIDO
  // =====================================================

  private static readonly MAX_GALLERY_FILE_BYTES = 50 * 1024 * 1024;
  private static readonly MAX_GALLERY_FILES_PER_MATCH = 20;

  private detectValidMedia(
    file: { originalname?: string; mimetype?: string; size?: number; buffer?: Buffer },
  ): { ext: string; mimeType: string; tipo: 'IMAGEN' | 'VIDEO' } {
    const ext = extname(file.originalname ?? '').toLowerCase();
    const mime = (file.mimetype ?? '').toLowerCase();
    const buf = file.buffer;
    const size = typeof file.size === 'number' ? file.size : (buf?.length ?? 0);

    if (!buf || size <= 0 || size > MatchesService.MAX_GALLERY_FILE_BYTES) {
      throw new BadRequestException(
        `El archivo "${file.originalname ?? 'archivo'}" excede el límite de 50 MB o está vacío.`,
      );
    }

    const isJpg =
      (ext === '.jpg' || ext === '.jpeg') &&
      mime === 'image/jpeg' &&
      buf.length >= 3 &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff;

    const isPng =
      ext === '.png' &&
      mime === 'image/png' &&
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a;

    const isMp4 =
      ext === '.mp4' &&
      mime === 'video/mp4' &&
      buf.length >= 12 &&
      buf.subarray(4, 8).toString('ascii') === 'ftyp';

    if (isJpg || isPng) {
      return { ext: isPng ? '.png' : '.jpg', mimeType: mime, tipo: 'IMAGEN' };
    }
    if (isMp4) {
      return { ext: '.mp4', mimeType: 'video/mp4', tipo: 'VIDEO' };
    }

    throw new BadRequestException(
      `Archivo inválido (${file.originalname ?? 'archivo'}). Solo se admiten JPG, PNG y MP4 válidos.`,
    );
  }

  async uploadMatchGallery(
    matchId: string,
    files: Array<{ originalname?: string; mimetype?: string; size?: number; buffer?: Buffer }>,
  ): Promise<Array<{ id: string; url: string; tipo: 'IMAGEN' | 'VIDEO'; tamanoBytes: number; mimeType: string; createdAt: Date }>> {
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('Debes adjuntar al menos un archivo JPG, PNG o MP4.');
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, state: true },
    });

    if (!match) {
      throw new NotFoundException('El partido solicitado no existe.');
    }

    if (match.state !== MatchState.FINALIZADO) {
      throw new ConflictException(
        'Solo se puede subir contenido multimedia a partidos en estado FINALIZADO.',
      );
    }

    const validated = files.map((file) => {
      const meta = this.detectValidMedia(file);
      const size = typeof file.size === 'number' ? file.size : (file.buffer?.length ?? 0);
      return { ...meta, size, buffer: file.buffer! };
    });

    const dir = join(process.cwd(), 'uploads', 'gallery', matchId);
    await mkdir(dir, { recursive: true });
    const writtenPaths: string[] = [];

    try {
      const createdItems = await this.prisma.$transaction(async (tx) => {
        const existingCount = await tx.galleryImage.count({
          where: { matchId },
        });

        if (existingCount + validated.length > MatchesService.MAX_GALLERY_FILES_PER_MATCH) {
          throw new ConflictException(
            `Se excede el cupo máximo de ${MatchesService.MAX_GALLERY_FILES_PER_MATCH} archivos por partido (actuales: ${existingCount}).`,
          );
        }

        const results: Array<{
          id: string;
          url: string;
          tipo: 'IMAGEN' | 'VIDEO';
          tamanoBytes: number;
          mimeType: string;
          createdAt: Date;
        }> = [];

        for (const item of validated) {
          const filename = `${randomUUID()}${item.ext}`;
          const fullPath = join(dir, filename);
          await writeFile(fullPath, item.buffer);
          writtenPaths.push(fullPath);

          const publicUrl = `/uploads/gallery/${matchId}/${filename}`;
          const record = await tx.galleryImage.create({
            data: {
              matchId,
              url: publicUrl,
            },
          });

          results.push({
            id: record.id,
            url: record.url,
            tipo: item.tipo,
            tamanoBytes: item.size,
            mimeType: item.mimeType,
            createdAt: record.createdAt,
          });
        }

        return results;
      });

      return createdItems;
    } catch (err) {
      await Promise.allSettled(writtenPaths.map((p) => unlink(p)));
      throw err;
    }
  }

  async getGalleryImages(matchId: string): Promise<GalleryImage[]> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { galleryImages: true },
    });
    if (!match) {
      throw new NotFoundException('El partido solicitado no existe.');
    }
    return match.galleryImages;
  }
}
