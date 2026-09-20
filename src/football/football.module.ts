import { Module } from '@nestjs/common';
import { TournamentsModule } from './tournaments/tournaments.module.js';

@Module({
  imports: [TournamentsModule],
})
export class FootballModule {}
