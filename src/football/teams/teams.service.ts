import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import { TeamDto } from './dto/team.dto.js';
import { Team } from './entities/team.entity.js';

export function toTeamDto(team: Team): TeamDto {
  return {
    id: team.id,
    name: team.name,
    code: team.code,
  };
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeamDto>> {
    const [teams, totalItems] = await this.teamsRepository.findAndCount({
      order: { name: 'ASC', id: 'ASC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return createPaginatedResponse(
      teams.map(toTeamDto),
      totalItems,
      pagination,
    );
  }

  async findOne(id: string): Promise<TeamDto> {
    const team = await this.teamsRepository.findOneBy({ id });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return toTeamDto(team);
  }
}
