import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../../api-keys/api-keys.module.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Goal } from '../goals/entities/goal.entity.js';
import { Substitution } from '../substitutions/entities/substitution.entity.js';
import { MatchPlayer } from './entities/match-player.entity.js';
import { Match } from './entities/match.entity.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [
    ApiKeysModule,
    TypeOrmModule.forFeature([Match, MatchPlayer, Goal, Substitution, Booking]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
