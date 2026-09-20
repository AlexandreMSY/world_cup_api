import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import argon2 from 'argon2';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ApiKeysService } from './api-keys.service.js';
import { ApiKey } from './entities/api-key.entity.js';

const queryBuilder = {
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  andWhere: vi.fn(),
  execute: vi.fn(),
};
const apiKeysRepository = {
  createQueryBuilder: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  findOne: vi.fn(),
};

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  beforeEach(async () => {
    vi.clearAllMocks();
    apiKeysRepository.findOne.mockResolvedValue(null);
    apiKeysRepository.save.mockResolvedValue(undefined);
    queryBuilder.update.mockReturnValue(queryBuilder);
    queryBuilder.set.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.execute.mockResolvedValue(undefined);
    apiKeysRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: getRepositoryToken(ApiKey), useValue: apiKeysRepository },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  it('creates one active API key and stores only its hash', async () => {
    apiKeysRepository.create.mockImplementation((apiKey) => apiKey);
    apiKeysRepository.save.mockResolvedValue(undefined);

    const response = await service.generate('user-id');
    const createdApiKey = apiKeysRepository.create.mock.calls[0][0];

    expect(response.api_key).toHaveLength(43);
    await expect(
      argon2.verify(createdApiKey.key_hash, response.api_key),
    ).resolves.toBe(true);
    expect(createdApiKey.key_fingerprint).toBe(
      createHash('sha256').update(response.api_key).digest('hex'),
    );
    expect(apiKeysRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
    );
  });

  it('rejects generation when the user already has an active API key', async () => {
    apiKeysRepository.findOne.mockResolvedValue({
      id: 'api-key-id',
      active: true,
    } as ApiKey);

    await expect(service.generate('user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(apiKeysRepository.save).not.toHaveBeenCalled();
  });

  it('converts the active-key unique-index race into a conflict', async () => {
    apiKeysRepository.findOne.mockResolvedValue(null);
    apiKeysRepository.create.mockImplementation((apiKey) => apiKey);
    apiKeysRepository.save.mockRejectedValue({
      driverError: {
        code: '23505',
        constraint: 'uq_api_keys_one_active_per_user',
      },
    });

    await expect(service.generate('user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('deactivates the authenticated user active API key', async () => {
    const apiKey = { id: 'api-key-id', active: true } as ApiKey;
    apiKeysRepository.findOne.mockResolvedValue(apiKey);

    await expect(service.delete('user-id')).resolves.toEqual({
      message: 'API key successfully deleted',
    });
    expect(apiKey.active).toBe(false);
    expect(apiKeysRepository.save).toHaveBeenCalledWith(apiKey);
  });

  it('rejects deletion when the user has no active API key', async () => {
    apiKeysRepository.findOne.mockResolvedValue(null);

    await expect(service.delete('user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
