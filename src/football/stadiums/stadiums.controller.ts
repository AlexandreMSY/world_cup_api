import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../../api-keys/guards/api-key-auth.guard.js';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import { PaginatedResponse } from '../../common/pagination/pagination.js';
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
}
