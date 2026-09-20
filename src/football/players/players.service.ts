import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { MatchPlayer } from '../matches/entities/match-player.entity.js';
import { toMatchSummaryDto } from '../matches/matches.service.js';
import { PlayerMatchSummaryDto } from './dto/player-match-summary.dto.js';
import { PlayerDto } from './dto/player.dto.js';
import { Player } from './entities/player.entity.js';

function toPlayerDto(player: Player): PlayerDto {
  return {
    id: player.id,
    name: player.name,
    team: { id: player.team.id, name: player.team.name },
  };
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayersRepository: Repository<MatchPlayer>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerDto>> {
    const [players, totalItems] = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoinAndSelect('player.team', 'team')
      .orderBy('player.name', 'ASC')
      .addOrderBy('player.id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      players.map(toPlayerDto),
      totalItems,
      pagination,
    );
  }

  async findOne(id: string): Promise<PlayerDto> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoinAndSelect('player.team', 'team')
      .where('player.id = :id', { id })
      .getOne();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return toPlayerDto(player);
  }

  async findMatches(
    id: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerMatchSummaryDto>> {
    await this.findOne(id);

    const [appearances, totalItems] = await this.matchPlayersRepository
      .createQueryBuilder('appearance')
      .innerJoinAndSelect('appearance.match', 'match')
      .innerJoinAndSelect('match.tournament', 'tournament')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.stadium', 'stadium')
      .where('appearance.player_id = :id', { id })
      .distinct(true)
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('match.kickoff_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('match.id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      appearances.map((appearance) => ({
        ...toMatchSummaryDto(appearance.match),
        starter: appearance.starter,
      })),
      totalItems,
      pagination,
    );
  }
}
