import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiKey } from '../src/api-keys/entities/api-key.entity.js';
import { ApiKeyAuthGuard } from '../src/api-keys/guards/api-key-auth.guard.js';
import { TeamsController } from '../src/football/teams/teams.controller.js';
import { TeamsService } from '../src/football/teams/teams.service.js';

const teamsService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  findMatches: vi.fn(),
};

const apiKeysRepository = {
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
};

describe('football route contracts (e2e)', () => {
  let app: INestApplication<App>;
  let validKeyHash: string;

  beforeAll(async () => {
    validKeyHash = await argon2.hash('test-api-key');
    apiKeysRepository.find.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        { provide: TeamsService, useValue: teamsService },
        ApiKeyAuthGuard,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: apiKeysRepository,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiKeysRepository.findOne.mockResolvedValue({
      key_hash: validKeyHash,
      active: true,
    });
    teamsService.findAll.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 without an X-API-Key', async () => {
    await request(app.getHttpServer()).get('/teams').expect(401);
    expect(teamsService.findAll).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-numeric public ID', async () => {
    await request(app.getHttpServer())
      .get('/teams/not-a-number')
      .set('X-API-Key', 'test-api-key')
      .expect(400);
    expect(teamsService.findOne).not.toHaveBeenCalled();
  });

  it('passes numeric public IDs to the service and returns 404 when absent', async () => {
    teamsService.findOne.mockRejectedValue(
      new NotFoundException('Team not found'),
    );

    await request(app.getHttpServer())
      .get('/teams/23')
      .set('X-API-Key', 'test-api-key')
      .expect(404);
    expect(teamsService.findOne).toHaveBeenCalledWith(23);
  });

  it('returns 400 for invalid pagination', async () => {
    await request(app.getHttpServer())
      .get('/teams?page=zero')
      .set('X-API-Key', 'test-api-key')
      .expect(400);
    expect(teamsService.findAll).not.toHaveBeenCalled();
  });

  it('clamps collection limits before controller delegation', async () => {
    teamsService.findAll.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });

    await request(app.getHttpServer())
      .get('/teams?page=1&limit=101')
      .set('X-API-Key', 'test-api-key')
      .expect(200)
      .expect({
        data: [],
        meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
      });
    expect(teamsService.findAll).toHaveBeenCalledWith({ page: 1, limit: 100 });
  });
});
