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

  it('returns numeric public IDs in a deterministic pagination envelope', async () => {
    stadiumsRepository.findAndCount.mockResolvedValue([
      [{ id: 'stadium-uuid', public_id: 14, ground: 'International Stadium' }],
      1,
    ]);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [{ id: 14, ground: 'International Stadium' }],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(stadiumsRepository.findAndCount).toHaveBeenCalledWith({
      order: { ground: 'ASC', public_id: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('resolves a public ID and uses the UUID only for match queries', async () => {
    stadiumsRepository.findOneBy.mockResolvedValue({
      id: 'stadium-uuid',
      public_id: 14,
      ground: 'International Stadium',
    });
    matchesService.findByStadium.mockResolvedValue({ data: [], meta: {} });

    await expect(service.findOne(14)).resolves.toMatchObject({ id: 14 });
    await service.findMatches(14, { page: 1, limit: 20 });
    expect(stadiumsRepository.findOneBy).toHaveBeenCalledWith({
      public_id: 14,
    });
    expect(matchesService.findByStadium).toHaveBeenCalledWith('stadium-uuid', {
      page: 1,
      limit: 20,
    });
  });

  it('rejects an unknown numeric ID', async () => {
    stadiumsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
