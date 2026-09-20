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

  @Get(':id')
  @ApiOperation({ summary: 'Get a football player' })
  @ApiOkResponse({ type: PlayerDto })
  @ApiNotFoundResponse({ description: 'Player not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PlayerDto> {
    return await this.playersService.findOne(id);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'List matches played by a football player' })
  @ApiOkResponse({ type: PlayerMatchSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Player not found.' })
  async findMatches(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerMatchSummaryDto>> {
    return await this.playersService.findMatches(id, pagination);
  }

  @Get(':id/goals')
  @ApiOperation({ summary: 'List goals scored by a football player' })
  @ApiOkResponse({ type: PlayerGoalDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Player not found.' })
  async findGoals(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<PlayerGoalDto>> {
    return await this.playersService.findGoals(id, pagination);
  }
}
