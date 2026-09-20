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
import { TeamDto } from '../teams/dto/team.dto.js';
import { TournamentDto } from './dto/tournament.dto.js';
import { TournamentsService } from './tournaments.service.js';

@Controller('tournaments')
@UseGuards(ApiKeyAuthGuard)
@ApiTags('Tournaments')
@ApiSecurity('apiKey')
@ApiUnauthorizedResponse({
  description: 'A valid X-API-Key header is required.',
})
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @ApiOperation({ summary: 'List World Cup tournaments' })
  @ApiOkResponse({ type: TournamentDto, isArray: true })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TournamentDto>> {
    return await this.tournamentsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a World Cup tournament' })
  @ApiOkResponse({ type: TournamentDto })
  @ApiNotFoundResponse({ description: 'Tournament not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TournamentDto> {
    return await this.tournamentsService.findOne(id);
  }

  @Get(':id/teams')
  @ApiOperation({ summary: 'List teams in a World Cup tournament' })
  @ApiOkResponse({ type: TeamDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Tournament not found.' })
  async findTeams(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeamDto>> {
    return await this.tournamentsService.findTeams(id, pagination);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'List matches in a World Cup tournament' })
  @ApiOkResponse({ type: MatchSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Tournament not found.' })
  async findMatches(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.tournamentsService.findMatches(id, pagination);
  }
}
