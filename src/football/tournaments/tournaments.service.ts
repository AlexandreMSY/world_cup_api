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
    slug: tournament.slug,
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
          slug: true,
          name: true,
          year: true,
          host: true,
          start_date: true,
          end_date: true,
        },
        order: { year: 'ASC', slug: 'ASC' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });

    return createPaginatedResponse(
      tournaments.map(toTournamentDto),
      totalItems,
      pagination,
    );
  }

  async findOne(slug: string): Promise<TournamentDto> {
    return toTournamentDto(await this.findEntity(slug));
  }

  async findTeams(
    slug: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeamDto>> {
    const tournament = await this.findEntity(slug);
    const [tournamentTeams, totalItems] = await this.tournamentTeamsRepository
      .createQueryBuilder('tournamentTeam')
      .innerJoinAndSelect('tournamentTeam.team', 'team')
      .where('tournamentTeam.tournament_id = :tournamentId', {
        tournamentId: tournament.id,
      })
      .orderBy('team.name', 'ASC')
      .addOrderBy('team.slug', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      tournamentTeams.map(({ team }) => ({
        slug: team.slug,
        name: team.name,
        code: team.code,
      })),
      totalItems,
      pagination,
    );
  }

  async findMatches(
    slug: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const tournament = await this.findEntity(slug);

    return await this.matchesService.findByTournament(
      tournament.id,
      pagination,
    );
  }

  private async findEntity(slug: string): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findOneBy({ slug });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }
}
