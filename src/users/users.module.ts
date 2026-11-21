import { Module } from '@nestjs/common';
import { UsersController } from './controllers/index.js';
import { UsersService } from './services/index.js';
import { UserRepository } from './repositories/index.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  // Se exporta también el repositorio para que otros módulos puedan reutilizar
  // el acceso a datos de usuarios sin pasar por la lógica de UsersService.
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
