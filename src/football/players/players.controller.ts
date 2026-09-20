import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { PlayerGoalDto } from '../goals/dto/goal.dto.js';
import { PlayerMatchSummaryDto } from './dto/player-match-summary.dto.js';
import { PlayerDto } from './dto/player.dto.js';
import { PlayersService } from './players.service.js';

@Controller('players')
@UseGuards(ApiKeyAuthGuard)
@ApiTags('Players')
@ApiSecurity('apiKey')
@ApiUnauthorizedResponse({
  description: 'A valid X-API-Key header is required.',
})
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiOperation({ summary: 'List football players' })
  @ApiOkResponse({ type: PlayerDto, isArray: true })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerDto>> {
    return await this.playersService.findAll(pagination);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a football player' })
  @ApiOkResponse({ type: PlayerDto })
  @ApiNotFoundResponse({ description: 'Player not found.' })
  async findOne(@Param('slug') slug: string): Promise<PlayerDto> {
    return await this.playersService.findOne(slug);
  }

  @Get(':slug/matches')
  @ApiOperation({ summary: 'List matches played by a football player' })
  @ApiOkResponse({ type: PlayerMatchSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Player not found.' })
  async findMatches(
    @Param('slug') slug: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerMatchSummaryDto>> {
    return await this.playersService.findMatches(slug, pagination);
  }

  @Get(':slug/goals')
  @ApiOperation({ summary: 'List goals scored by a football player' })
  @ApiOkResponse({ type: PlayerGoalDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Player not found.' })
  async findGoals(
    @Param('slug') slug: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerGoalDto>> {
    return await this.playersService.findGoals(slug, pagination);
  }
}
