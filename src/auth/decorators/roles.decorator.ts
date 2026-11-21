import { SetMetadata } from '@nestjs/common';
import type { Role } from '@PrismaClient';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a uno o más roles.
 *
 * Funciona junto con RolesGuard (registrado como guard global): primero
 * JwtAuthGuard autentica y carga al usuario, y después RolesGuard compara su
 * rol con los permitidos. Una ruta sin @Roles queda abierta a cualquier
 * usuario autenticado.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
