import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Goal } from '../goals/entities/goal.entity.js';
import { MatchPlayer } from '../matches/entities/match-player.entity.js';
import { Player } from './entities/player.entity.js';
import { PlayersService } from './players.service.js';

function createQueryBuilderMock() {
  const query = {
    innerJoinAndSelect: vi.fn(),
    leftJoinAndSelect: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
    distinct: vi.fn(),
    orderBy: vi.fn(),
    addOrderBy: vi.fn(),
    skip: vi.fn(),
    take: vi.fn(),
    getManyAndCount: vi.fn(),
    getOne: vi.fn(),
  };
  for (const method of [
    'innerJoinAndSelect',
    'leftJoinAndSelect',
    'select',
    'where',
    'distinct',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

const playersQuery = createQueryBuilderMock();
const playersRepository = { createQueryBuilder: vi.fn() };
const matchPlayersRepository = { createQueryBuilder: vi.fn() };
const goalsRepository = { createQueryBuilder: vi.fn() };
const player = {
  id: 'player-uuid',
  public_id: 18,
  name: 'Ronaldo',
  team: { id: 'team-uuid', public_id: 7, name: 'Brazil' },
};

describe('PlayersService', () => {
  let service: PlayersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    playersRepository.createQueryBuilder.mockReturnValue(playersQuery);
    const module = await Test.createTestingModule({
      providers: [
        PlayersService,
        { provide: getRepositoryToken(Player), useValue: playersRepository },
        {
          provide: getRepositoryToken(MatchPlayer),
          useValue: matchPlayersRepository,
        },
        { provide: getRepositoryToken(Goal), useValue: goalsRepository },
      ],
    }).compile();
    service = module.get(PlayersService);
  });

  it('returns numeric public IDs for players and their teams', async () => {
    playersQuery.getManyAndCount.mockResolvedValue([[player], 1]);
    await expect(
      service.findAll({ page: 1, limit: 20 }),
    ).resolves.toMatchObject({
      data: [{ id: 18, team: { id: 7 } }],
    });
    expect(playersQuery.addOrderBy).toHaveBeenCalledWith(
      'player.public_id',
      'ASC',
    );
  });

  it('looks up a player by numeric public ID', async () => {
    playersQuery.getOne.mockResolvedValue(player);
    await expect(service.findOne(18)).resolves.toMatchObject({
      id: 18,
      team: { id: 7 },
    });
    expect(playersQuery.where).toHaveBeenCalledWith('player.public_id = :id', {
      id: 18,
    });
  });

  it('returns 404 for an unknown numeric player ID', async () => {
    playersQuery.getOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
