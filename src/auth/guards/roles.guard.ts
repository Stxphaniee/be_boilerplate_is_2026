import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { RequestWithUser } from '../decorators/current-user.decorator.js';
import type { Role } from '@PrismaClient';

/**
 * Guard global de autorización por rol (403 si el rol no corresponde).
 *
 * Tiene que registrarse DESPUÉS de JwtAuthGuard: depende de que este ya haya
 * cargado `request.user`, que se relee de la base en cada request, así que un
 * cambio de rol aplica de inmediato sin esperar a que expire el token.
 *
 * Importa los decoradores por ruta relativa por la misma razón que
 * JwtAuthGuard: evitar un ciclo entre los barrels de guards/ y decorators/.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return true;
  }
}
