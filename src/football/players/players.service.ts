import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { Goal } from '../goals/entities/goal.entity.js';
import { PlayerGoalDto } from '../goals/dto/goal.dto.js';
import { MatchPlayer } from '../matches/entities/match-player.entity.js';
import { toMatchSummaryDto } from '../matches/matches.service.js';
import { PlayerMatchSummaryDto } from './dto/player-match-summary.dto.js';
import { PlayerDto } from './dto/player.dto.js';
import { Player } from './entities/player.entity.js';

function toPlayerDto(player: Player): PlayerDto {
  return {
    id: player.public_id,
    name: player.name,
    team: { id: player.team.public_id, name: player.team.name },
  };
}

function toPlayerGoalDto(goal: Goal): PlayerGoalDto {
  return {
    team: { id: goal.team.public_id, name: goal.team.name },
    player: { id: goal.player.public_id, name: goal.player.name },
    minute: goal.minute,
    addedTime: goal.added_time,
    penalty: goal.penalty,
    ownGoal: goal.own_goal,
    match: {
      id: goal.match.public_id,
      round: goal.match.round,
      date: goal.match.match_date,
      homeTeam: {
        id: goal.match.homeTeam.public_id,
        name: goal.match.homeTeam.name,
      },
      awayTeam: {
        id: goal.match.awayTeam.public_id,
        name: goal.match.awayTeam.name,
      },
    },
  };
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepository: Repository<Player>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayersRepository: Repository<MatchPlayer>,
    @InjectRepository(Goal)
    private readonly goalsRepository: Repository<Goal>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerDto>> {
    const [players, totalItems] = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoinAndSelect('player.team', 'team')
      .orderBy('player.name', 'ASC')
      .addOrderBy('player.public_id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      players.map(toPlayerDto),
      totalItems,
      pagination,
    );
  }

  async findOne(id: number): Promise<PlayerDto> {
    return toPlayerDto(await this.findEntity(id));
  }

  async findMatches(
    id: number,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerMatchSummaryDto>> {
    const player = await this.findEntity(id);
    const [appearances, totalItems] = await this.matchPlayersRepository
      .createQueryBuilder('appearance')
      .innerJoinAndSelect('appearance.match', 'match')
      .innerJoinAndSelect('match.tournament', 'tournament')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.stadium', 'stadium')
      .select([
        'appearance.id',
        'appearance.starter',
        'match.id',
        'match.public_id',
        'match.round',
        'match.match_date',
        'match.kickoff_time',
        'match.home_score',
        'match.away_score',
        'tournament.id',
        'tournament.public_id',
        'tournament.name',
        'tournament.year',
        'homeTeam.id',
        'homeTeam.public_id',
        'homeTeam.name',
        'awayTeam.id',
        'awayTeam.public_id',
        'awayTeam.name',
        'stadium.id',
        'stadium.public_id',
        'stadium.ground',
      ])
      .where('appearance.player_id = :playerId', { playerId: player.id })
      .distinct(true)
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('match.kickoff_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('match.public_id', 'ASC')
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

  async findGoals(
    id: number,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerGoalDto>> {
    const player = await this.findEntity(id);
    const [goals, totalItems] = await this.goalsRepository
      .createQueryBuilder('goal')
      .innerJoinAndSelect('goal.player', 'player')
      .innerJoinAndSelect('goal.team', 'team')
      .innerJoinAndSelect('goal.match', 'match')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .select([
        'goal.id',
        'goal.minute',
        'goal.added_time',
        'goal.penalty',
        'goal.own_goal',
        'player.id',
        'player.public_id',
        'player.name',
        'team.id',
        'team.public_id',
        'team.name',
        'match.id',
        'match.public_id',
        'match.round',
        'match.match_date',
        'homeTeam.id',
        'homeTeam.public_id',
        'homeTeam.name',
        'awayTeam.id',
        'awayTeam.public_id',
        'awayTeam.name',
      ])
      .where('goal.player_id = :playerId', { playerId: player.id })
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('goal.minute', 'ASC', 'NULLS LAST')
      .addOrderBy('goal.added_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('goal.id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      goals.map(toPlayerGoalDto),
      totalItems,
      pagination,
    );
  }

  private async findEntity(id: number): Promise<Player> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoinAndSelect('player.team', 'team')
      .where('player.public_id = :id', { id })
      .getOne();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }
}
