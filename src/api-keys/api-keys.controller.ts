import { Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
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
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async generate(
    @Req() request: AuthenticatedRequest,
  ): Promise<CreatedApiKeyDto> {
    return await this.apiKeysService.generate(request.user.id);
  }

  @Delete()
  async delete(
    @Req() request: AuthenticatedRequest,
  ): Promise<DeletedApiKeyDto> {
    return await this.apiKeysService.delete(request.user.id);
  }
}
