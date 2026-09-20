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
const appearancesQuery = createQueryBuilderMock();
const goalsQuery = createQueryBuilderMock();
const playersRepository = { createQueryBuilder: vi.fn() };
const matchPlayersRepository = { createQueryBuilder: vi.fn() };
const goalsRepository = { createQueryBuilder: vi.fn() };
const player = {
  id: 'player-id',
  slug: 'ronaldo',
  name: 'Ronaldo',
  team: { id: 'team-id', slug: 'brazil', name: 'Brazil' },
};

describe('PlayersService', () => {
  let service: PlayersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    playersRepository.createQueryBuilder.mockReturnValue(playersQuery);
    matchPlayersRepository.createQueryBuilder.mockReturnValue(appearancesQuery);
    goalsRepository.createQueryBuilder.mockReturnValue(goalsQuery);
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

  it('returns slug-only players in a deterministic pagination envelope', async () => {
    playersQuery.getManyAndCount.mockResolvedValue([[player], 1]);
    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [
        {
          slug: 'ronaldo',
          name: 'Ronaldo',
          team: { slug: 'brazil', name: 'Brazil' },
        },
      ],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(playersQuery.addOrderBy).toHaveBeenCalledWith('player.slug', 'ASC');
  });

  it('resolves a player slug and uses its UUID for related records', async () => {
    playersQuery.getOne.mockResolvedValue(player);
    appearancesQuery.getManyAndCount.mockResolvedValue([
      [
        {
          starter: true,
          match: {
            id: 'match-id',
            slug: '2002-germany-brazil-final',
            tournament: {
              id: 'tournament-id',
              slug: 'world-cup-2002',
              name: 'FIFA World Cup',
              year: 2002,
            },
            round: 'Final',
            match_date: '2002-06-30',
            homeTeam: { id: 'home-id', slug: 'germany', name: 'Germany' },
            awayTeam: { id: 'away-id', slug: 'brazil', name: 'Brazil' },
            home_score: 0,
            away_score: 2,
            stadium: null,
          },
        },
      ],
      1,
    ]);

    await expect(service.findOne('ronaldo')).resolves.toEqual({
      slug: 'ronaldo',
      name: 'Ronaldo',
      team: { slug: 'brazil', name: 'Brazil' },
    });
    const result = await service.findMatches('ronaldo', { page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      slug: '2002-germany-brazil-final',
      starter: true,
    });
    expect(playersQuery.where).toHaveBeenCalledWith('player.slug = :slug', {
      slug: 'ronaldo',
    });
    expect(appearancesQuery.where).toHaveBeenCalledWith(
      'appearance.player_id = :playerId',
      { playerId: 'player-id' },
    );
  });

  it('returns player goals with a slug-only basic match object', async () => {
    playersQuery.getOne.mockResolvedValue(player);
    goalsQuery.getManyAndCount.mockResolvedValue([
      [
        {
          player,
          team: player.team,
          minute: 67,
          added_time: null,
          penalty: false,
          own_goal: false,
          match: {
            id: 'match-id',
            slug: '2002-germany-brazil-final',
            round: 'Final',
            match_date: '2002-06-30',
            homeTeam: { id: 'home-id', slug: 'germany', name: 'Germany' },
            awayTeam: player.team,
          },
        },
      ],
      1,
    ]);

    const result = await service.findGoals('ronaldo', { page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      player: { slug: 'ronaldo' },
      match: { slug: '2002-germany-brazil-final', date: '2002-06-30' },
    });
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0].match).not.toHaveProperty('id');
  });

  it('rejects an unknown player slug before child queries', async () => {
    playersQuery.getOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.findGoals('missing', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(goalsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
