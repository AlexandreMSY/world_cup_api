import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../../api-keys/api-keys.module.js';
import { MatchesModule } from '../matches/matches.module.js';
import { Stadium } from './entities/stadium.entity.js';
import { StadiumsController } from './stadiums.controller.js';
import { StadiumsService } from './stadiums.service.js';

@Module({
  imports: [ApiKeysModule, MatchesModule, TypeOrmModule.forFeature([Stadium])],
  controllers: [StadiumsController],
  providers: [StadiumsService],
})
export class StadiumsModule {}
