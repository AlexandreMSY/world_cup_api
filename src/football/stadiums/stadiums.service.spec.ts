import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Stadium } from './entities/stadium.entity.js';
import { StadiumsService } from './stadiums.service.js';

const stadiumsRepository = {
  findAndCount: vi.fn(),
  findOneBy: vi.fn(),
};

describe('StadiumsService', () => {
  let service: StadiumsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        StadiumsService,
        {
          provide: getRepositoryToken(Stadium),
          useValue: stadiumsRepository,
        },
      ],
    }).compile();

    service = module.get(StadiumsService);
  });

  it('returns deterministically ordered stadiums in a pagination envelope', async () => {
    stadiumsRepository.findAndCount.mockResolvedValue([
      [{ id: 'stadium-id', ground: 'International Stadium' }],
      1,
    ]);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [{ id: 'stadium-id', ground: 'International Stadium' }],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(stadiumsRepository.findAndCount).toHaveBeenCalledWith({
      order: { ground: 'ASC', id: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('returns one stadium', async () => {
    stadiumsRepository.findOneBy.mockResolvedValue({
      id: 'stadium-id',
      ground: 'International Stadium',
    });

    await expect(service.findOne('stadium-id')).resolves.toEqual({
      id: 'stadium-id',
      ground: 'International Stadium',
    });
  });

  it('rejects a missing stadium', async () => {
    stadiumsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
