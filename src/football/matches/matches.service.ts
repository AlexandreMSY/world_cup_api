import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { MatchSummaryDto } from './dto/match-summary.dto.js';
import { Match } from './entities/match.entity.js';

export function toMatchSummaryDto(match: Match): MatchSummaryDto {
  return {
    id: match.id,
    tournament: {
      id: match.tournament.id,
      name: match.tournament.name,
      year: match.tournament.year,
    },
    round: match.round,
    date: match.match_date,
    homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name },
    awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name },
    score: { home: match.home_score, away: match.away_score },
    stadium: match.stadium
      ? { id: match.stadium.id, ground: match.stadium.ground }
      : null,
  };
}

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
  ) {}

  private createSummaryQuery(): SelectQueryBuilder<Match> {
    return this.matchesRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.tournament', 'tournament')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.stadium', 'stadium');
  }

  private async paginateSummaryQuery(
    query: SelectQueryBuilder<Match>,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const [matches, totalItems] = await query
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('match.kickoff_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('match.id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      matches.map(toMatchSummaryDto),
      totalItems,
      pagination,
    );
  }

  async findByTournament(
    tournamentId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const query = this.createSummaryQuery().where(
      'match.tournament_id = :tournamentId',
      { tournamentId },
    );

    return await this.paginateSummaryQuery(query, pagination);
  }
}
