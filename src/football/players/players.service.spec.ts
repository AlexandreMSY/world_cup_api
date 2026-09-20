import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Player } from './entities/player.entity.js';
import { PlayersService } from './players.service.js';

const queryBuilder = {
  innerJoinAndSelect: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  addOrderBy: vi.fn(),
  skip: vi.fn(),
  take: vi.fn(),
  getManyAndCount: vi.fn(),
  getOne: vi.fn(),
};

const playersRepository = {
  createQueryBuilder: vi.fn(),
};

describe('PlayersService', () => {
  let service: PlayersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    for (const method of [
      'innerJoinAndSelect',
      'where',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ] as const) {
      queryBuilder[method].mockReturnValue(queryBuilder);
    }
    playersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: getRepositoryToken(Player),
          useValue: playersRepository,
        },
      ],
    }).compile();

    service = module.get(PlayersService);
  });

  it('returns deterministically ordered players in a pagination envelope', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([
      [
        {
          id: 'player-id',
          name: 'Ronaldo',
          team: { id: 'team-id', name: 'Brazil' },
        },
      ],
      1,
    ]);

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [
        {
          id: 'player-id',
          name: 'Ronaldo',
          team: { id: 'team-id', name: 'Brazil' },
        },
      ],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('player.name', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('player.id', 'ASC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
  });

  it('returns one player with its team', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'player-id',
      name: 'Ronaldo',
      team: { id: 'team-id', name: 'Brazil' },
    });

    await expect(service.findOne('player-id')).resolves.toEqual({
      id: 'player-id',
      name: 'Ronaldo',
      team: { id: 'team-id', name: 'Brazil' },
    });
  });

  it('rejects a missing player', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
