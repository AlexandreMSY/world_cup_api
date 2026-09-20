import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TournamentDto> {
    return await this.tournamentsService.findOne(id);
  }
}
