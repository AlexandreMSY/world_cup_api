import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Goal } from '../goals/entities/goal.entity.js';
import { Substitution } from '../substitutions/entities/substitution.entity.js';
import { MatchPlayer } from './entities/match-player.entity.js';
import { Match } from './entities/match.entity.js';
import { MatchesService } from './matches.service.js';

function createQueryBuilderMock() {
  const query = {
    innerJoinAndSelect: vi.fn(),
    leftJoinAndSelect: vi.fn(),
    select: vi.fn(),
    addSelect: vi.fn(),
    where: vi.fn(),
    distinct: vi.fn(),
    orderBy: vi.fn(),
    addOrderBy: vi.fn(),
    skip: vi.fn(),
    take: vi.fn(),
    getManyAndCount: vi.fn(),
    getOne: vi.fn(),
    getMany: vi.fn(),
  };
  for (const method of [
    'innerJoinAndSelect',
    'leftJoinAndSelect',
    'select',
    'addSelect',
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

const matchQuery = createQueryBuilderMock();
const matchesRepository = { createQueryBuilder: vi.fn() };
const matchPlayersRepository = { createQueryBuilder: vi.fn() };
const goalsRepository = { createQueryBuilder: vi.fn() };
const substitutionsRepository = { createQueryBuilder: vi.fn() };
const bookingsRepository = { createQueryBuilder: vi.fn() };
const match = {
  id: 'match-uuid',
  public_id: 41,
  tournament: {
    id: 'tournament-uuid',
    public_id: 23,
    name: 'FIFA World Cup',
    year: 2002,
  },
  round: 'Final',
  match_date: '2002-06-30',
  kickoff_time: '20:00:00',
  homeTeam: { id: 'home-uuid', public_id: 7, name: 'Germany' },
  awayTeam: { id: 'away-uuid', public_id: 8, name: 'Brazil' },
  home_score: 0,
  away_score: 2,
  home_score_et: null,
  away_score_et: null,
  home_score_penalties: null,
  away_score_penalties: null,
  stadium: null,
};

describe('MatchesService', () => {
  let service: MatchesService;

  beforeEach(async () => {
    vi.clearAllMocks();
    matchesRepository.createQueryBuilder.mockReturnValue(matchQuery);
    const module = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: getRepositoryToken(Match), useValue: matchesRepository },
        {
          provide: getRepositoryToken(MatchPlayer),
          useValue: matchPlayersRepository,
        },
        { provide: getRepositoryToken(Goal), useValue: goalsRepository },
        {
          provide: getRepositoryToken(Substitution),
          useValue: substitutionsRepository,
        },
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
      ],
    }).compile();
    service = module.get(MatchesService);
  });

  it('returns numeric IDs for a match and all summary references', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[match], 1]);
    await expect(
      service.findByTournament('tournament-uuid', { page: 1, limit: 20 }),
    ).resolves.toMatchObject({
      data: [
        {
          id: 41,
          tournament: { id: 23 },
          homeTeam: { id: 7 },
          awayTeam: { id: 8 },
        },
      ],
    });
    expect(matchQuery.addOrderBy).toHaveBeenCalledWith(
      'match.public_id',
      'ASC',
    );
  });

  it('uses numeric public IDs to look up match details', async () => {
    matchQuery.getOne.mockResolvedValue(match);
    for (const repository of [
      matchPlayersRepository,
      goalsRepository,
      substitutionsRepository,
      bookingsRepository,
    ]) {
      const query = createQueryBuilderMock();
      query.getMany.mockResolvedValue([]);
      repository.createQueryBuilder.mockReturnValue(query);
    }
    await expect(service.findOne(41)).resolves.toMatchObject({ id: 41 });
    expect(matchQuery.where).toHaveBeenCalledWith('match.public_id = :id', {
      id: 41,
    });
  });

  it('returns 404 for an unknown numeric match ID', async () => {
    matchQuery.getOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
