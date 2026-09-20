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
import { TeamDto } from './dto/team.dto.js';
import { Team } from './entities/team.entity.js';

export function toTeamDto(team: Team): TeamDto {
  return {
    id: team.public_id,
    name: team.name,
    code: team.code,
  };
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    private readonly matchesService: MatchesService,
  ) {}

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeamDto>> {
    const [teams, totalItems] = await this.teamsRepository.findAndCount({
      order: { name: 'ASC', public_id: 'ASC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return createPaginatedResponse(
      teams.map(toTeamDto),
      totalItems,
      pagination,
    );
  }

  async findOne(id: number): Promise<TeamDto> {
    return toTeamDto(await this.findEntity(id));
  }

  async findMatches(
    id: number,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const team = await this.findEntity(id);

    return await this.matchesService.findByTeam(team.id, pagination);
  }

  private async findEntity(id: number): Promise<Team> {
    const team = await this.teamsRepository.findOneBy({ public_id: id });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }
}
