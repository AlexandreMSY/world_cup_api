import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchesService } from '../matches/matches.service.js';
import { Team } from './entities/team.entity.js';
import { TeamsService } from './teams.service.js';

const teamsRepository = {
  findAndCount: vi.fn(),
  findOneBy: vi.fn(),
};

const matchesService = {
  findByTeam: vi.fn(),
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
        {
          provide: MatchesService,
          useValue: matchesService,
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

  it('returns team matches after validating the parent', async () => {
    teamsRepository.findOneBy.mockResolvedValue({
      id: 'team-id',
      name: 'Brazil',
      code: 'BRA',
    });
    matchesService.findByTeam.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    await expect(
      service.findMatches('team-id', { page: 1, limit: 20 }),
    ).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
    expect(matchesService.findByTeam).toHaveBeenCalledWith('team-id', {
      page: 1,
      limit: 20,
    });
  });

  it('does not query matches when the team is missing', async () => {
    teamsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.findMatches('missing-id', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(matchesService.findByTeam).not.toHaveBeenCalled();
  });
});
