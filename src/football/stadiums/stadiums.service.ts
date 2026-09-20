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
import { StadiumDto } from './dto/stadium.dto.js';
import { Stadium } from './entities/stadium.entity.js';

function toStadiumDto(stadium: Stadium): StadiumDto {
  return { slug: stadium.slug, ground: stadium.ground };
}

@Injectable()
export class StadiumsService {
  constructor(
    @InjectRepository(Stadium)
    private readonly stadiumsRepository: Repository<Stadium>,
    private readonly matchesService: MatchesService,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<StadiumDto>> {
    const [stadiums, totalItems] = await this.stadiumsRepository.findAndCount({
      order: { ground: 'ASC', slug: 'ASC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return createPaginatedResponse(
      stadiums.map(toStadiumDto),
      totalItems,
      pagination,
    );
  }

  async findOne(slug: string): Promise<StadiumDto> {
    return toStadiumDto(await this.findEntity(slug));
  }

  async findMatches(
    slug: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const stadium = await this.findEntity(slug);

    return await this.matchesService.findByStadium(stadium.id, pagination);
  }

  private async findEntity(slug: string): Promise<Stadium> {
    const stadium = await this.stadiumsRepository.findOneBy({ slug });

    if (!stadium) {
      throw new NotFoundException('Stadium not found');
    }

    return stadium;
  }
}
