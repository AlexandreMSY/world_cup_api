import { Module } from '@nestjs/common';
import { TeamsModule } from './teams/teams.module.js';
import { TournamentsModule } from './tournaments/tournaments.module.js';

@Module({
  imports: [TournamentsModule, TeamsModule],
})
export class FootballModule {}
