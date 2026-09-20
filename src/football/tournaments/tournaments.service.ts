import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { MatchSummaryDto } from '../matches/dto/match-summary.dto.js';
import { MatchesService } from '../matches/matches.service.js';
import { TeamDto } from '../teams/dto/team.dto.js';
import { TournamentDto } from './dto/tournament.dto.js';
import { TournamentTeam } from './entities/tournament-team.entity.js';
import { Tournament } from './entities/tournament.entity.js';

function toTournamentDto(tournament: Tournament): TournamentDto {
  return {
    id: tournament.id,
    name: tournament.name,
    year: tournament.year,
    host: tournament.host,
    startDate: tournament.start_date,
    endDate: tournament.end_date,
  };
}

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentsRepository: Repository<Tournament>,
    @InjectRepository(TournamentTeam)
    private readonly tournamentTeamsRepository: Repository<TournamentTeam>,
    private readonly matchesService: MatchesService,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TournamentDto>> {
    const [tournaments, totalItems] =
      await this.tournamentsRepository.findAndCount({
        select: {
          id: true,
          name: true,
          year: true,
          host: true,
          start_date: true,
          end_date: true,
        },
        order: { year: 'ASC', id: 'ASC' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });

    return createPaginatedResponse(
      tournaments.map(toTournamentDto),
      totalItems,
      pagination,
    );
  }

  async findOne(id: string): Promise<TournamentDto> {
    const tournament = await this.tournamentsRepository.findOneBy({ id });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return toTournamentDto(tournament);
  }

  async findTeams(
    id: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeamDto>> {
    await this.findOne(id);

    const [tournamentTeams, totalItems] = await this.tournamentTeamsRepository
      .createQueryBuilder('tournamentTeam')
      .innerJoinAndSelect('tournamentTeam.team', 'team')
      .where('tournamentTeam.tournament_id = :id', { id })
      .orderBy('team.name', 'ASC')
      .addOrderBy('team.id', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      tournamentTeams.map(({ team }) => ({
        id: team.id,
        name: team.name,
        code: team.code,
      })),
      totalItems,
      pagination,
    );
  }

  async findMatches(
    id: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    await this.findOne(id);

    return await this.matchesService.findByTournament(id, pagination);
  }
}
