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
    slug: player.slug,
    name: player.name,
    team: { slug: player.team.slug, name: player.team.name },
  };
}

function toPlayerGoalDto(goal: Goal): PlayerGoalDto {
  return {
    team: { slug: goal.team.slug, name: goal.team.name },
    player: { slug: goal.player.slug, name: goal.player.name },
    minute: goal.minute,
    addedTime: goal.added_time,
    penalty: goal.penalty,
    ownGoal: goal.own_goal,
    match: {
      slug: goal.match.slug,
      round: goal.match.round,
      date: goal.match.match_date,
      homeTeam: {
        slug: goal.match.homeTeam.slug,
        name: goal.match.homeTeam.name,
      },
      awayTeam: {
        slug: goal.match.awayTeam.slug,
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
      .addOrderBy('player.slug', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      players.map(toPlayerDto),
      totalItems,
      pagination,
    );
  }

  async findOne(slug: string): Promise<PlayerDto> {
    return toPlayerDto(await this.findEntity(slug));
  }

  async findMatches(
    slug: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerMatchSummaryDto>> {
    const player = await this.findEntity(slug);
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
        'match.slug',
        'match.round',
        'match.match_date',
        'match.kickoff_time',
        'match.home_score',
        'match.away_score',
        'tournament.id',
        'tournament.slug',
        'tournament.name',
        'tournament.year',
        'homeTeam.id',
        'homeTeam.slug',
        'homeTeam.name',
        'awayTeam.id',
        'awayTeam.slug',
        'awayTeam.name',
        'stadium.id',
        'stadium.slug',
        'stadium.ground',
      ])
      .where('appearance.player_id = :playerId', { playerId: player.id })
      .distinct(true)
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('match.kickoff_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('match.slug', 'ASC')
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
    slug: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerGoalDto>> {
    const player = await this.findEntity(slug);
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
        'player.slug',
        'player.name',
        'team.id',
        'team.slug',
        'team.name',
        'match.id',
        'match.slug',
        'match.round',
        'match.match_date',
        'homeTeam.id',
        'homeTeam.slug',
        'homeTeam.name',
        'awayTeam.id',
        'awayTeam.slug',
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

  private async findEntity(slug: string): Promise<Player> {
    const player = await this.playersRepository
      .createQueryBuilder('player')
      .innerJoinAndSelect('player.team', 'team')
      .where('player.slug = :slug', { slug })
      .getOne();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }
}
