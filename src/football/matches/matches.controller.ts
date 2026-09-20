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
import {
  MatchGoalsDto,
  MatchDetailDto,
  MatchPlayersDto,
} from './dto/match-detail.dto.js';
import { MatchSummaryDto } from './dto/match-summary.dto.js';
import { MatchesService } from './matches.service.js';

@Controller('matches')
@UseGuards(ApiKeyAuthGuard)
@ApiTags('Matches')
@ApiSecurity('apiKey')
@ApiUnauthorizedResponse({
  description: 'A valid X-API-Key header is required.',
})
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'List football matches' })
  @ApiOkResponse({ type: MatchSummaryDto, isArray: true })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.matchesService.findAll(pagination);
  }

  @Get(':id/players')
  @ApiOperation({ summary: 'Get grouped player appearances for a match' })
  @ApiOkResponse({ type: MatchPlayersDto })
  @ApiNotFoundResponse({ description: 'Match not found.' })
  async findPlayers(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchPlayersDto> {
    return await this.matchesService.findPlayers(id);
  }

  @Get(':id/goals')
  @ApiOperation({ summary: 'Get grouped goals for a match' })
  @ApiOkResponse({ type: MatchGoalsDto })
  @ApiNotFoundResponse({ description: 'Match not found.' })
  async findGoals(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchGoalsDto> {
    return await this.matchesService.findGoals(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a football match with lineups and events' })
  @ApiOkResponse({ type: MatchDetailDto })
  @ApiNotFoundResponse({ description: 'Match not found.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchDetailDto> {
    return await this.matchesService.findOne(id);
  }
}
