import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { Goal } from '../goals/entities/goal.entity.js';
import { MatchPlayer } from '../matches/entities/match-player.entity.js';
import { toMatchSummaryDto } from '../matches/matches.service.js';
import { PlayerGoalDto } from '../goals/dto/goal.dto.js';
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

function toPlayerGoalDto(goal: Goal): PlayerGoalDto {
  return {
    id: goal.id,
    team: { id: goal.team.id, name: goal.team.name },
    player: { id: goal.player.id, name: goal.player.name },
    minute: goal.minute,
    addedTime: goal.added_time,
    penalty: goal.penalty,
    ownGoal: goal.own_goal,
    match: {
      id: goal.match.id,
      tournament: {
        id: goal.match.tournament.id,
        name: goal.match.tournament.name,
        year: goal.match.tournament.year,
      },
      round: goal.match.round,
      date: goal.match.match_date,
      homeTeam: {
        id: goal.match.homeTeam.id,
        name: goal.match.homeTeam.name,
      },
      awayTeam: {
        id: goal.match.awayTeam.id,
        name: goal.match.awayTeam.name,
      },
      score: {
        home: goal.match.home_score,
        away: goal.match.away_score,
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

  async findGoals(
    id: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerGoalDto>> {
    await this.findOne(id);

    const [goals, totalItems] = await this.goalsRepository
      .createQueryBuilder('goal')
      .innerJoinAndSelect('goal.player', 'player')
      .innerJoinAndSelect('goal.team', 'team')
      .innerJoinAndSelect('goal.match', 'match')
      .innerJoinAndSelect('match.tournament', 'tournament')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .where('goal.player_id = :id', { id })
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
}
