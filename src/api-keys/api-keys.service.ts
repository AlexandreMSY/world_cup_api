import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { CreatedApiKeyDto } from './dto/created-api-key-dto.js';
import { DeletedApiKeyDto } from './dto/deleted-api-key-dto.js';
import { ApiKey } from './entities/api-key.entity.js';
import { User } from '../auth/entities/user.entity.js';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeysRepository: Repository<ApiKey>,
  ) {}

  async generate(userId: string): Promise<CreatedApiKeyDto> {
    await this.apiKeysRepository
      .createQueryBuilder()
      .update(ApiKey)
      .set({ active: false })
      .where('user_id = :userId', { userId })
      .andWhere('active = :active', { active: true })
      .execute();

    const apiKey = randomBytes(32).toString('base64url');
    const hashedApiKey = await argon2.hash(apiKey);
    const newApiKey = this.apiKeysRepository.create({
      user: { id: userId } as User,
      key_hash: hashedApiKey,
      active: true,
    });

    await this.apiKeysRepository.save(newApiKey);

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
