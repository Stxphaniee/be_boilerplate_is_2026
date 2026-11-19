import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  CategoriaNotificacion,
  ModuloOrigenNotificacion,
  Prisma,
} from '@PrismaClient';
import type { Notification } from '@PrismaClient';

/** Contrato interno de H20 (invocado solo por módulos backend). */
export interface CrearAvisoInput {
  destinatarioId: string;
  categoria: CategoriaNotificacion;
  titulo: string;
  mensaje: string;
  moduloOrigen: ModuloOrigenNotificacion;
  referencia?: string;
  eventoId: string;
  esCritica?: boolean;
}

export type CrearAvisoMasivoInput = Omit<CrearAvisoInput, 'destinatarioId'> & {
  destinatarios: string[];
};

/**
 * HU20 - Servicio centralizado de avisos.
 * Persiste cada aviso, es idempotente por (eventoId, destinatario) y respeta
 * las preferencias del usuario salvo en avisos críticos.
 */
@Injectable()
export class NotificacionService {
  constructor(private readonly prisma: PrismaService) {}

  async crearAviso(input: CrearAvisoInput): Promise<Notification | null> {
    this.validar(input);

    const user = await this.prisma.user.findUnique({
      where: { id: input.destinatarioId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('El destinatario del aviso no existe.');
    }

    const esCritica = input.esCritica ?? false;
    if (
      !esCritica &&
      !(await this.categoriaActiva(input.destinatarioId, input.categoria))
    ) {
      return null;
    }

    try {
      return await this.prisma.notification.create({
        data: {
          userId: input.destinatarioId,
          title: input.titulo,
          message: input.mensaje,
          category: input.categoria,
          sourceModule: input.moduloOrigen,
          reference: input.referencia ?? null,
          eventId: input.eventoId,
          isCritical: esCritica,
        },
      });
    } catch (error) {
      // Mismo evento para el mismo usuario: se omite el duplicado.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  /** Emite el mismo aviso a varios destinatarios sin duplicar usuarios. */
  async crearAvisos(input: CrearAvisoMasivoInput): Promise<Notification[]> {
    const { destinatarios, ...rest } = input;
    const unicos = [...new Set(destinatarios.filter(Boolean))];
    const creados: Notification[] = [];
    for (const destinatarioId of unicos) {
      const aviso = await this.crearAviso({ ...rest, destinatarioId });
      if (aviso) creados.push(aviso);
    }
    return creados;
  }

  /** Punto de extensión para las preferencias de H21. */
  protected async categoriaActiva(
    _usuarioId: string,
    _categoria: CategoriaNotificacion,
  ): Promise<boolean> {
    return true;
  }

  private validar(input: CrearAvisoInput): void {
    const errores: string[] = [];
    if (!Object.values(CategoriaNotificacion).includes(input.categoria)) {
      errores.push('Categoría inválida.');
    }
    if (!Object.values(ModuloOrigenNotificacion).includes(input.moduloOrigen)) {
      errores.push('Módulo de origen inválido.');
    }
    const titulo = input.titulo?.trim() ?? '';
    if (titulo.length < 1 || titulo.length > 100) {
      errores.push('El título debe tener entre 1 y 100 caracteres.');
    }
    const mensaje = input.mensaje?.trim() ?? '';
    if (mensaje.length < 1 || mensaje.length > 500) {
      errores.push('El mensaje debe tener entre 1 y 500 caracteres.');
    }
    if (input.referencia && input.referencia.length > 100) {
      errores.push('La referencia admite máximo 100 caracteres.');
    }
    if (!input.eventoId?.trim()) {
      errores.push('El eventoId es obligatorio.');
    }
    if (errores.length) throw new BadRequestException(errores);
  }
}
