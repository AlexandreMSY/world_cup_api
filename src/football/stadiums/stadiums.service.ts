import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { StadiumDto } from './dto/stadium.dto.js';
import { Stadium } from './entities/stadium.entity.js';

function toStadiumDto(stadium: Stadium): StadiumDto {
  return { id: stadium.id, ground: stadium.ground };
}

@Injectable()
export class StadiumsService {
  constructor(
    @InjectRepository(Stadium)
    private readonly stadiumsRepository: Repository<Stadium>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<StadiumDto>> {
    const [stadiums, totalItems] = await this.stadiumsRepository.findAndCount({
      order: { ground: 'ASC', id: 'ASC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return createPaginatedResponse(
      stadiums.map(toStadiumDto),
      totalItems,
      pagination,
    );
  }
}
