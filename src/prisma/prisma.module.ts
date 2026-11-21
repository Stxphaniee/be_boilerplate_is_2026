import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service.js';

/**
 * Global para que cualquier repositorio pueda inyectar PrismaService
 * sin tener que importar PrismaModule explícitamente.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}