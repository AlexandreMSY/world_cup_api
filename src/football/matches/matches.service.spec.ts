import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Match } from './entities/match.entity.js';
import { MatchesService } from './matches.service.js';

const queryBuilder = {
  innerJoinAndSelect: vi.fn(),
  leftJoinAndSelect: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  addOrderBy: vi.fn(),
  skip: vi.fn(),
  take: vi.fn(),
  getManyAndCount: vi.fn(),
};

const matchesRepository = {
  createQueryBuilder: vi.fn(),
};

describe('MatchesService', () => {
  let service: MatchesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    for (const method of [
      'innerJoinAndSelect',
      'leftJoinAndSelect',
      'where',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ] as const) {
      queryBuilder[method].mockReturnValue(queryBuilder);
    }
    matchesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module = await Test.createTestingModule({
      providers: [
        MatchesService,
        {
          provide: getRepositoryToken(Match),
          useValue: matchesRepository,
        },
      ],
    }).compile();

    service = module.get(MatchesService);
  });

  it('returns deterministic tournament match summaries', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([
      [
        {
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
          stadium: { id: 'stadium-id', ground: 'International Stadium' },
        },
      ],
      1,
    ]);

    await expect(
      service.findByTournament('tournament-id', { page: 2, limit: 10 }),
    ).resolves.toEqual({
      data: [
        {
          id: 'match-id',
          tournament: {
            id: 'tournament-id',
            name: 'FIFA World Cup',
            year: 2002,
          },
          round: 'Final',
          date: '2002-06-30',
          homeTeam: { id: 'home-id', name: 'Germany' },
          awayTeam: { id: 'away-id', name: 'Brazil' },
          score: { home: 0, away: 2 },
          stadium: {
            id: 'stadium-id',
            ground: 'International Stadium',
          },
        },
      ],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'match.tournament_id = :tournamentId',
      { tournamentId: 'tournament-id' },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'match.match_date',
      'ASC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'match.kickoff_time',
      'ASC',
      'NULLS FIRST',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('match.id', 'ASC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
  });
});
