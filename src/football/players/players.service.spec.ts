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
const playersRepository = {
  createQueryBuilder: vi.fn(),
};
const matchPlayersRepository = {
  createQueryBuilder: vi.fn(),
};
const goalsRepository = {
  createQueryBuilder: vi.fn(),
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
        {
          provide: getRepositoryToken(Player),
          useValue: playersRepository,
        },
        {
          provide: getRepositoryToken(MatchPlayer),
          useValue: matchPlayersRepository,
        },
        {
          provide: getRepositoryToken(Goal),
          useValue: goalsRepository,
        },
      ],
    }).compile();

    service = module.get(PlayersService);
  });

  it('returns deterministically ordered players in a pagination envelope', async () => {
    playersQuery.getManyAndCount.mockResolvedValue([
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
    expect(playersQuery.orderBy).toHaveBeenCalledWith('player.name', 'ASC');
    expect(playersQuery.addOrderBy).toHaveBeenCalledWith('player.id', 'ASC');
    expect(playersQuery.skip).toHaveBeenCalledWith(10);
  });

  it('returns one player with its team', async () => {
    playersQuery.getOne.mockResolvedValue({
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
    playersQuery.getOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns matches with starter status after validating the player', async () => {
    playersQuery.getOne.mockResolvedValue({
      id: 'player-id',
      name: 'Ronaldo',
      team: { id: 'team-id', name: 'Brazil' },
    });
    appearancesQuery.getManyAndCount.mockResolvedValue([
      [
        {
          starter: true,
          match: {
            id: 'match-id',
            tournament: {
              id: 'tournament-id',
              name: 'FIFA World Cup',
              year: 2002,
            },
            round: 'Final',
            match_date: '2002-06-30',
            homeTeam: { id: 'home-id', name: 'Germany' },
            awayTeam: { id: 'away-id', name: 'Brazil' },
            home_score: 0,
            away_score: 2,
            stadium: null,
          },
        },
      ],
      1,
    ]);

    const result = await service.findMatches('player-id', {
      page: 1,
      limit: 20,
    });

    expect(result.data[0]).toMatchObject({ id: 'match-id', starter: true });
    expect(appearancesQuery.distinct).toHaveBeenCalledWith(true);
    expect(appearancesQuery.orderBy).toHaveBeenCalledWith(
      'match.match_date',
      'ASC',
    );
  });

  it('does not query appearances when the player is missing', async () => {
    playersQuery.getOne.mockResolvedValue(null);

    await expect(
      service.findMatches('missing-id', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(matchPlayersRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns player goals with a basic match object', async () => {
    playersQuery.getOne.mockResolvedValue({
      id: 'player-id',
      name: 'Ronaldo',
      team: { id: 'team-id', name: 'Brazil' },
    });
    goalsQuery.getManyAndCount.mockResolvedValue([
      [
        {
          id: 'goal-id',
          player: { id: 'player-id', name: 'Ronaldo' },
          team: { id: 'team-id', name: 'Brazil' },
          minute: 67,
          added_time: null,
          penalty: false,
          own_goal: false,
          match: {
            id: 'match-id',
            tournament: {
              id: 'tournament-id',
              name: 'FIFA World Cup',
              year: 2002,
            },
            round: 'Final',
            match_date: '2002-06-30',
            homeTeam: { id: 'home-id', name: 'Germany' },
            awayTeam: { id: 'team-id', name: 'Brazil' },
            home_score: 0,
            away_score: 2,
          },
        },
      ],
      1,
    ]);

    const result = await service.findGoals('player-id', {
      page: 1,
      limit: 20,
    });

    expect(result.data[0]).toMatchObject({
      id: 'goal-id',
      minute: 67,
      addedTime: null,
      match: {
        id: 'match-id',
        date: '2002-06-30',
        score: { home: 0, away: 2 },
      },
    });
    expect(goalsQuery.orderBy).toHaveBeenCalledWith('match.match_date', 'ASC');
    expect(goalsQuery.addOrderBy).toHaveBeenCalledWith(
      'goal.minute',
      'ASC',
      'NULLS LAST',
    );
  });

  it('does not query goals when the player is missing', async () => {
    playersQuery.getOne.mockResolvedValue(null);

    await expect(
      service.findGoals('missing-id', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(goalsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
