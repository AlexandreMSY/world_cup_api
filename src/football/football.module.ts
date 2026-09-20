import { Module } from '@nestjs/common';
import { PlayersModule } from './players/players.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { TournamentsModule } from './tournaments/tournaments.module.js';

@Module({
  imports: [TournamentsModule, TeamsModule, PlayersModule],
})
export class FootballModule {}
