import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/services/index.js';
import {
  NotificationCategory,
  NotificationSourceModule,
  Prisma,
} from '../../generated/prisma/client.js';
import type { Notification } from '../../generated/prisma/client.js';

export interface CrearAvisoInput {
  destinatarioId: string;
  categoria: NotificationCategory;
  titulo: string;
  mensaje: string;
  moduloOrigen: NotificationSourceModule;
  referencia?: string;
  /** Debe mantenerse igual en los reintentos del mismo evento (idempotencia). */
  eventoId: string;
  esCritica?: boolean;
}

/** Firma de la rama HU20 sin alterar las llamadas previas de HU17. */
export type CrearAvisoMasivoInput = Omit<CrearAvisoInput, 'destinatarioId'> & {
  destinatarios: string[];
};

const TITULO_MAX = 100;
const MENSAJE_MAX = 500;
const REFERENCIA_MAX = 100;

/**
 * Servicio interno de avisos (contrato de H20). Solo lo invocan módulos
 * del backend; el cliente nunca emite avisos arbitrarios.
 */
@Injectable()
export class NotificacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste un aviso. Devuelve `null` cuando se omite: ya existía un aviso
   * para el mismo (eventoId, destinatario).
   */
  async crearAviso(input: CrearAvisoInput): Promise<Notification | null> {
    this.validar(input);

    const destinatario = await this.prisma.user.findUnique({
      where: { id: input.destinatarioId },
      select: { id: true },
    });

    if (!destinatario) {
      throw new NotFoundException('El destinatario del aviso no existe.');
    }

    // HU20: las preferencias futuras de HU21 solo bloquean avisos no criticos.
    const esCritica = input.esCritica ?? false;
    if (!esCritica && !(await this.categoriaActiva(input.destinatarioId, input.categoria))) {
      return null;
    }

    try {
      if (!input.esCritica && this.prisma.preferenciaNotificacion) {
      const pref = await this.prisma.preferenciaNotificacion.findUnique({
        where: {
          userId_categoria: {
            userId: input.destinatarioId,
            categoria: input.categoria,
          },
        },
      });
      if (pref && pref.activa === false) {
        return null;
      }
    }

    return await this.prisma.notification.create({
        data: this.toData(input),
      });
    } catch (error) {
      if (this.esDuplicado(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Emite el mismo aviso a varios destinatarios, deduplicando usuarios que
   * ocupan más de un rol. Devuelve cuántos avisos se crearon realmente.
   */
  /** Contrato HU17: lista de IDs y payload -> total creado. */
  async crearAvisos(
    destinatarioIds: Iterable<string>,
    base: Omit<CrearAvisoInput, 'destinatarioId'>,
  ): Promise<number>;
  /** Contrato HU20: objeto con destinatarios -> avisos creados. */
  async crearAvisos(input: CrearAvisoMasivoInput): Promise<Notification[]>;
  async crearAvisos(
    idsOrInput: Iterable<string> | CrearAvisoMasivoInput,
    base?: Omit<CrearAvisoInput, 'destinatarioId'>,
  ): Promise<number | Notification[]> {
    const masivo = idsOrInput as CrearAvisoMasivoInput;
    if (Array.isArray(masivo.destinatarios)) {
      const { destinatarios, ...rest } = masivo;
      const creados: Notification[] = [];
      for (const destinatarioId of new Set(destinatarios.filter(Boolean))) {
        const aviso = await this.crearAviso({ ...rest, destinatarioId });
        if (aviso) creados.push(aviso);
      }
      return creados;
    }

    if (!base) {
      throw new BadRequestException('Datos base del aviso requeridos.');
    }
    let creados = 0;
    for (const destinatarioId of new Set(idsOrInput as Iterable<string>)) {
      const aviso = await this.crearAviso({ ...base, destinatarioId });
      if (aviso) creados += 1;
    }
    return creados;
  }

  /** Extension para HU21; HU20 sin preferencias configuradas deja pasar avisos. */
  protected async categoriaActiva(
    _usuarioId: string,
    _categoria: NotificationCategory,
  ): Promise<boolean> {
    return true;
  }

  private toData(
    input: CrearAvisoInput,
  ): Prisma.NotificationUncheckedCreateInput {
    return {
      userId: input.destinatarioId,
      category: input.categoria,
      sourceModule: input.moduloOrigen,
      title: input.titulo,
      message: input.mensaje,
      reference: input.referencia ?? null,
      eventId: input.eventoId,
      isCritical: input.esCritica ?? false,
    };
  }

  private validar(input: CrearAvisoInput): void {
    if (!Object.values(NotificationCategory).includes(input.categoria)) {
      throw new BadRequestException('Categoría de aviso inválida.');
    }

    if (!Object.values(NotificationSourceModule).includes(input.moduloOrigen)) {
      throw new BadRequestException('Módulo de origen inválido.');
    }

    if (!input.eventoId?.trim()) {
      throw new BadRequestException('eventoId es obligatorio.');
    }

    if (!input.titulo || input.titulo.length > TITULO_MAX) {
      throw new BadRequestException(`El título debe tener 1–${TITULO_MAX} caracteres.`);
    }

    if (!input.mensaje || input.mensaje.length > MENSAJE_MAX) {
      throw new BadRequestException(`El mensaje debe tener 1–${MENSAJE_MAX} caracteres.`);
    }

    if (input.referencia && input.referencia.length > REFERENCIA_MAX) {
      throw new BadRequestException(`La referencia admite máximo ${REFERENCIA_MAX} caracteres.`);
    }
  }

  private esDuplicado(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
