import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { CreatedApiKeyDto } from './dto/created-api-key-dto.js';
import { DeletedApiKeyDto } from './dto/deleted-api-key-dto.js';
import { ApiKey } from './entities/api-key.entity.js';
import { User } from '../auth/entities/user.entity.js';

function isActiveApiKeyUniqueViolation(error: unknown): boolean {
  const databaseError = error as {
    driverError?: { code?: string; constraint?: string };
  };

  return (
    databaseError.driverError?.code === '23505' &&
    databaseError.driverError.constraint?.toLowerCase() ===
      'uq_api_keys_one_active_per_user'
  );
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeysRepository: Repository<ApiKey>,
  ) {}

  async generate(userId: string): Promise<CreatedApiKeyDto> {
    const activeApiKey = await this.apiKeysRepository.findOne({
      where: {
        user: { id: userId },
        active: true,
      },
    });

    if (activeApiKey) {
      throw new ConflictException('An active API key already exists');
    }

    const apiKey = randomBytes(32).toString('base64url');
    const hashedApiKey = await argon2.hash(apiKey);
    const apiKeyFingerprint = createHash('sha256').update(apiKey).digest('hex');
    const newApiKey = this.apiKeysRepository.create({
      user: { id: userId } as User,
      key_hash: hashedApiKey,
      key_fingerprint: apiKeyFingerprint,
      active: true,
    });

    try {
      await this.apiKeysRepository.save(newApiKey);
    } catch (error) {
      if (isActiveApiKeyUniqueViolation(error)) {
        throw new ConflictException('An active API key already exists');
      }

      throw error;
    }

    return { api_key: apiKey };
  }

  async delete(userId: string): Promise<DeletedApiKeyDto> {
    const apiKey = await this.apiKeysRepository.findOne({
      where: {
        user: { id: userId },
        active: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('No active API key found');
    }

    apiKey.active = false;
    await this.apiKeysRepository.save(apiKey);

    return { message: 'API key successfully deleted' };
  }
}
