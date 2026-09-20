import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../../api-keys/api-keys.module.js';
import { MatchesModule } from '../matches/matches.module.js';
import { Team } from '../teams/entities/team.entity.js';
import { TournamentTeam } from './entities/tournament-team.entity.js';
import { Tournament } from './entities/tournament.entity.js';
import { TournamentsController } from './tournaments.controller.js';
import { TournamentsService } from './tournaments.service.js';

@Module({
  imports: [
    ApiKeysModule,
    MatchesModule,
    TypeOrmModule.forFeature([Tournament, TournamentTeam, Team]),
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
