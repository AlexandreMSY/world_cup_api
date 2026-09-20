import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity.js';

export function createApiKeyFingerprint(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeysRepository: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('X-API-Key');

    if (!apiKey) {
      throw new UnauthorizedException();
    }

    try {
      const fingerprint = createApiKeyFingerprint(apiKey);
      const storedApiKey = await this.apiKeysRepository.findOne({
        where: { key_fingerprint: fingerprint, active: true },
      });

      if (storedApiKey) {
        if (await argon2.verify(storedApiKey.key_hash, apiKey)) {
          return true;
        }

        throw new UnauthorizedException();
      }

      // Legacy rows are scanned once, then upgraded to indexed fingerprint lookup.
      const legacyApiKeys = await this.apiKeysRepository.find({
        where: { key_fingerprint: IsNull(), active: true },
      });

      for (const legacyApiKey of legacyApiKeys) {
        if (await argon2.verify(legacyApiKey.key_hash, apiKey)) {
          legacyApiKey.key_fingerprint = fingerprint;
          await this.apiKeysRepository.save(legacyApiKey);
          return true;
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException();
    }

    throw new UnauthorizedException();
  }
}
