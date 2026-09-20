import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { TournamentDto } from './dto/tournament.dto.js';
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
}
