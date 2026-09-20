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
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TeamDto> {
    return await this.teamsService.findOne(id);
  }
}
