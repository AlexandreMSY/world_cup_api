import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../../api-keys/api-keys.module.js';
import { MatchPlayer } from '../matches/entities/match-player.entity.js';
import { Player } from './entities/player.entity.js';
import { PlayersController } from './players.controller.js';
import { PlayersService } from './players.service.js';

@Module({
  imports: [ApiKeysModule, TypeOrmModule.forFeature([Player, MatchPlayer])],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
