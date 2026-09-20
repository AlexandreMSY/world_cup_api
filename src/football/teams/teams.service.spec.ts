import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from './entities/team.entity.js';
import { TeamsService } from './teams.service.js';

const teamsRepository = {
  findAndCount: vi.fn(),
  findOneBy: vi.fn(),
};

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: teamsRepository,
        },
      ],
    }).compile();

    service = module.get(TeamsService);
  });

  it('returns deterministically ordered teams in a pagination envelope', async () => {
    teamsRepository.findAndCount.mockResolvedValue([
      [{ id: 'team-id', name: 'Brazil', code: 'BRA' }],
      1,
    ]);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [{ id: 'team-id', name: 'Brazil', code: 'BRA' }],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(teamsRepository.findAndCount).toHaveBeenCalledWith({
      order: { name: 'ASC', id: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('returns one team', async () => {
    teamsRepository.findOneBy.mockResolvedValue({
      id: 'team-id',
      name: 'Brazil',
      code: 'BRA',
    });

    await expect(service.findOne('team-id')).resolves.toEqual({
      id: 'team-id',
      name: 'Brazil',
      code: 'BRA',
    });
  });

  it('rejects a missing team', async () => {
    teamsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
