import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@Auth/guards';
import type { Role } from '@PrismaClient';

function contextFor(user: { role: Role } | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(roles: Role[] | undefined) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(roles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('deja pasar rutas sin @Roles', () => {
    expect(
      guardRequiring(undefined).canActivate(contextFor({ role: 'JUGADOR' })),
    ).toBe(true);
  });

  it('permite al rol requerido', () => {
    expect(
      guardRequiring(['CAPITAN']).canActivate(contextFor({ role: 'CAPITAN' })),
    ).toBe(true);
  });

  it('responde 403 a un rol distinto', () => {
    expect(() =>
      guardRequiring(['CAPITAN']).canActivate(contextFor({ role: 'JUGADOR' })),
    ).toThrow(ForbiddenException);
  });

  it('responde 403 si no hay usuario en el request', () => {
    expect(() =>
      guardRequiring(['CAPITAN']).canActivate(contextFor(undefined)),
    ).toThrow(ForbiddenException);
  });
});
