import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchesService } from '../matches/matches.service.js';
import { Team } from './entities/team.entity.js';
import { TeamsService } from './teams.service.js';

const teamsRepository = { findAndCount: vi.fn(), findOneBy: vi.fn() };
const matchesService = { findByTeam: vi.fn() };

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getRepositoryToken(Team), useValue: teamsRepository },
        { provide: MatchesService, useValue: matchesService },
      ],
    }).compile();
    service = module.get(TeamsService);
  });

  it('returns numeric public IDs in a deterministic pagination envelope', async () => {
    teamsRepository.findAndCount.mockResolvedValue([
      [{ id: 'team-uuid', public_id: 7, name: 'Brazil', code: 'BRA' }],
      1,
    ]);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [{ id: 7, name: 'Brazil', code: 'BRA' }],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(teamsRepository.findAndCount).toHaveBeenCalledWith({
      order: { name: 'ASC', public_id: 'ASC' },
      skip: 10,
      take: 10,
    });
  });

  it('resolves a public ID and uses the UUID only for match queries', async () => {
    teamsRepository.findOneBy.mockResolvedValue({
      id: 'team-uuid',
      public_id: 7,
      name: 'Brazil',
      code: 'BRA',
    });
    matchesService.findByTeam.mockResolvedValue({ data: [], meta: {} });

    await expect(service.findOne(7)).resolves.toMatchObject({ id: 7 });
    await service.findMatches(7, { page: 1, limit: 20 });
    expect(teamsRepository.findOneBy).toHaveBeenCalledWith({ public_id: 7 });
    expect(matchesService.findByTeam).toHaveBeenCalledWith('team-uuid', {
      page: 1,
      limit: 20,
    });
  });

  it('rejects an unknown numeric ID', async () => {
    teamsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
