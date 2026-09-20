import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../../api-keys/guards/api-key-auth.guard.js';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../../common/pagination/pagination.js';
import { MatchSummaryDto } from '../matches/dto/match-summary.dto.js';
import { TeamDto } from './dto/team.dto.js';
import { TeamsService } from './teams.service.js';

@Controller('teams')
@UseGuards(ApiKeyAuthGuard)
@ApiTags('Teams')
@ApiSecurity('apiKey')
@ApiUnauthorizedResponse({
  description: 'A valid X-API-Key header is required.',
})
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List football teams' })
  @ApiOkResponse({ type: TeamDto, isArray: true })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeamDto>> {
    return await this.teamsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a football team' })
  @ApiOkResponse({ type: TeamDto })
  @ApiNotFoundResponse({ description: 'Team not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TeamDto> {
    return await this.teamsService.findOne(id);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'List matches played by a football team' })
  @ApiOkResponse({ type: MatchSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Team not found.' })
  async findMatches(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.teamsService.findMatches(id, pagination);
  }
}
