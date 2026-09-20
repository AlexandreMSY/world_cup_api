import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { ApiKey } from '../entities/api-key.entity.js';
import {
  ApiKeyAuthGuard,
  createApiKeyFingerprint,
} from './api-key-auth.guard.js';

function createContext(apiKey?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name.toLowerCase() === 'x-api-key' ? apiKey : undefined,
      }),
    }),
  } as ExecutionContext;
}

const apiKeysRepository = {
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
};

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    apiKeysRepository.findOne.mockResolvedValue(null);
    apiKeysRepository.find.mockResolvedValue([]);
    apiKeysRepository.save.mockResolvedValue(undefined);
    guard = new ApiKeyAuthGuard(apiKeysRepository as never);
  });

  it('accepts an active API key found by fingerprint', async () => {
    const rawApiKey = 'active-api-key';
    apiKeysRepository.findOne.mockResolvedValue({
      key_hash: await argon2.hash(rawApiKey),
      active: true,
    });

    await expect(guard.canActivate(createContext(rawApiKey))).resolves.toBe(
      true,
    );
    expect(apiKeysRepository.findOne).toHaveBeenCalledWith({
      where: {
        key_fingerprint: createApiKeyFingerprint(rawApiKey),
        active: true,
      },
    });
  });

  it('rejects missing and invalid API keys', async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      guard.canActivate(createContext('invalid-api-key')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies and fingerprints a legacy active key', async () => {
    const rawApiKey = 'legacy-api-key';
    const legacyApiKey = {
      id: 'legacy-id',
      key_hash: await argon2.hash(rawApiKey),
      key_fingerprint: null,
      active: true,
    } as ApiKey;
    apiKeysRepository.find.mockResolvedValue([legacyApiKey]);

    await expect(guard.canActivate(createContext(rawApiKey))).resolves.toBe(
      true,
    );
    expect(legacyApiKey.key_fingerprint).toBe(
      createApiKeyFingerprint(rawApiKey),
    );
    expect(apiKeysRepository.save).toHaveBeenCalledWith(legacyApiKey);
  });
});
