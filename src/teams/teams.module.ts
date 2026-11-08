import { Module } from '@nestjs/common';
import { TeamsController } from '@Teams/controllers';
import { TeamsService } from '@Teams/services';
import { SeasonRepository, TeamRepository } from '@Teams/repositories';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamRepository, SeasonRepository],
  exports: [TeamsService, TeamRepository],
})
export class TeamsModule {}
