import { Module } from '@nestjs/common';
import { MatchesModule } from './matches/matches.module.js';
import { PlayersModule } from './players/players.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { TournamentsModule } from './tournaments/tournaments.module.js';

@Module({
  imports: [TournamentsModule, TeamsModule, PlayersModule, MatchesModule],
})
export class FootballModule {}
