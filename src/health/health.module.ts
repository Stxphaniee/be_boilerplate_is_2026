import { Module } from '@nestjs/common';
import { HealthController } from './controllers/index.js';
import { HealthService } from './services/index.js';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
