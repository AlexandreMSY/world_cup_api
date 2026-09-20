import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../auth/entities/user.entity.js';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysService } from './api-keys.service.js';
import { ApiKey } from './entities/api-key.entity.js';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ApiKey, User])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard, JwtAuthGuard],
  exports: [ApiKeyAuthGuard, TypeOrmModule],
})
export class ApiKeysModule {}
