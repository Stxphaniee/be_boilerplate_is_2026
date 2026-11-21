import { PlayerStatsModule } from './player-stats/player-stats.module.js';
import { RankingModule } from './ranking/ranking.module.js';
import { RegistrationPaymentsModule } from './registration-payments/registration-payments.module.js';
import { AdminPaymentsModule } from './admin-payments/admin-payments.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/index.js';
import { JwtAuthGuard, RolesGuard } from './auth/guards/index.js';
import { HealthModule } from './health/index.js';
import { PrismaModule } from './prisma/index.js';
import { TeamsModule } from './teams/index.js';
import { UsersModule } from './users/index.js';
import { validateEnv } from './config/index.js';
import { MatchesModule } from './matches/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Si falta DATABASE_URL o JWT_SECRET, la app no arranca.
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    TeamsModule,
    MatchesModule,
    PlayerStatsModule,
    RankingModule,
    RegistrationPaymentsModule,
    AdminPaymentsModule,
  ],
  providers: [
    {
      // Todo cerrado por defecto: las rutas públicas se abren con @Public().
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      // Corre después del anterior: ya hay usuario en el request y compara su
      // rol con el de @Roles(). Las rutas sin @Roles no se ven afectadas.
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
