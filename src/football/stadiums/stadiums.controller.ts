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
import { MatchSummaryDto } from '../matches/dto/match-summary.dto.js';
import { StadiumDto } from './dto/stadium.dto.js';
import { StadiumsService } from './stadiums.service.js';

@Controller('stadiums')
@UseGuards(ApiKeyAuthGuard)
@ApiTags('Stadiums')
@ApiSecurity('apiKey')
@ApiUnauthorizedResponse({
  description: 'A valid X-API-Key header is required.',
})
export class StadiumsController {
  constructor(private readonly stadiumsService: StadiumsService) {}

  @Get()
  @ApiOperation({ summary: 'List football stadiums' })
  @ApiOkResponse({ type: StadiumDto, isArray: true })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<StadiumDto>> {
    return await this.stadiumsService.findAll(pagination);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a football stadium' })
  @ApiOkResponse({ type: StadiumDto })
  @ApiNotFoundResponse({ description: 'Stadium not found.' })
  async findOne(@Param('slug') slug: string): Promise<StadiumDto> {
    return await this.stadiumsService.findOne(slug);
  }

  @Get(':slug/matches')
  @ApiOperation({ summary: 'List matches played at a football stadium' })
  @ApiOkResponse({ type: MatchSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Stadium not found.' })
  async findMatches(
    @Param('slug') slug: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.stadiumsService.findMatches(slug, pagination);
  }
}
