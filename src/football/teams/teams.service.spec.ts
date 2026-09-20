import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from './entities/team.entity.js';
import { TeamsService } from './teams.service.js';

const teamsRepository = {
  findAndCount: vi.fn(),
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
});
