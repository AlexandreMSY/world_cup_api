import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchesService } from '../matches/matches.service.js';
import { Stadium } from './entities/stadium.entity.js';
import { StadiumsService } from './stadiums.service.js';

const stadiumsRepository = { findAndCount: vi.fn(), findOneBy: vi.fn() };
const matchesService = { findByStadium: vi.fn() };

describe('StadiumsService', () => {
  let service: StadiumsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        StadiumsService,
        { provide: getRepositoryToken(Stadium), useValue: stadiumsRepository },
        { provide: MatchesService, useValue: matchesService },
      ],
    }).compile();
    service = module.get(StadiumsService);
  });

  it('returns slug-only stadiums in a deterministic pagination envelope', async () => {
    stadiumsRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'stadium-id',
          slug: 'international-stadium',
          ground: 'International Stadium',
        },
      ],
      1,
    ]);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [
        { slug: 'international-stadium', ground: 'International Stadium' },
      ],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(stadiumsRepository.findAndCount).toHaveBeenCalledWith({
      order: { ground: 'ASC', slug: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('resolves a stadium slug and uses its UUID only for match queries', async () => {
    stadiumsRepository.findOneBy.mockResolvedValue({
      id: 'stadium-id',
      slug: 'international-stadium',
      ground: 'International Stadium',
    });
    matchesService.findByStadium.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    await expect(service.findOne('international-stadium')).resolves.toEqual({
      slug: 'international-stadium',
      ground: 'International Stadium',
    });
    await service.findMatches('international-stadium', {
      page: 1,
      limit: 20,
    });
    expect(matchesService.findByStadium).toHaveBeenCalledWith('stadium-id', {
      page: 1,
      limit: 20,
    });
  });

  it('rejects an unknown slug', async () => {
    stadiumsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
