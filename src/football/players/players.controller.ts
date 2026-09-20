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
}
