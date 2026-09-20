import { Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service.js';
import { CreatedApiKeyDto } from './dto/created-api-key-dto.js';
import { DeletedApiKeyDto } from './dto/deleted-api-key-dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('api-key')
@UseGuards(JwtAuthGuard)
@ApiTags('API Keys')
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse({ description: 'A valid Bearer token is required.' })
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({
    summary: 'Generate an API key to be used for football api access',
  })
  @ApiCreatedResponse({
    description: 'A new API key. Save it now; it cannot be retrieved again.',
    type: CreatedApiKeyDto,
  })
  async generate(
    @Req() request: AuthenticatedRequest,
  ): Promise<CreatedApiKeyDto> {
    return await this.apiKeysService.generate(request.user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Deactivate the active API key' })
  @ApiOkResponse({ type: DeletedApiKeyDto })
  @ApiNotFoundResponse({ description: 'No active API key was found.' })
  async delete(
    @Req() request: AuthenticatedRequest,
  ): Promise<DeletedApiKeyDto> {
    return await this.apiKeysService.delete(request.user.id);
  }
}
