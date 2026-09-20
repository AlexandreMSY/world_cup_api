import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Match])],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
