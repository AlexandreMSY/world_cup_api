import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CardType, Booking } from '../bookings/entities/booking.entity.js';
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
const appearancesQuery = createQueryBuilderMock();
const goalsQuery = createQueryBuilderMock();
const substitutionsQuery = createQueryBuilderMock();
const bookingsQuery = createQueryBuilderMock();

const matchesRepository = { createQueryBuilder: vi.fn() };
const matchPlayersRepository = { createQueryBuilder: vi.fn() };
const goalsRepository = { createQueryBuilder: vi.fn() };
const substitutionsRepository = { createQueryBuilder: vi.fn() };
const bookingsRepository = { createQueryBuilder: vi.fn() };

const match = {
  id: 'match-id',
  tournament: {
    id: 'tournament-id',
    name: 'FIFA World Cup',
    year: 2002,
  },
  round: 'Final',
  match_date: '2002-06-30',
  kickoff_time: '20:00:00',
  homeTeam: { id: 'home-id', name: 'Germany' },
  awayTeam: { id: 'away-id', name: 'Brazil' },
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
    matchPlayersRepository.createQueryBuilder.mockReturnValue(appearancesQuery);
    goalsRepository.createQueryBuilder.mockReturnValue(goalsQuery);
    substitutionsRepository.createQueryBuilder.mockReturnValue(
      substitutionsQuery,
    );
    bookingsRepository.createQueryBuilder.mockReturnValue(bookingsQuery);

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
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingsRepository,
        },
      ],
    }).compile();

    service = module.get(MatchesService);
  });

  it('returns deterministic tournament match summaries', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[match], 1]);

    await expect(
      service.findByTournament('tournament-id', { page: 2, limit: 10 }),
    ).resolves.toMatchObject({
      data: [{ id: 'match-id', date: '2002-06-30' }],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(matchQuery.where).toHaveBeenCalledWith(
      'match.tournament_id = :tournamentId',
      { tournamentId: 'tournament-id' },
    );
    expect(matchQuery.addOrderBy).toHaveBeenCalledWith(
      'match.kickoff_time',
      'ASC',
      'NULLS FIRST',
    );
    expect(matchQuery.skip).toHaveBeenCalledWith(10);
  });

  it('uses a grouped home-or-away condition for team matches', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[], 0]);

    await service.findByTeam('team-id', { page: 1, limit: 20 });

    expect(matchQuery.where).toHaveBeenCalledOnce();
    expect(matchQuery.where.mock.calls[0][0].constructor.name).toBe('Brackets');
    expect(matchQuery.distinct).toHaveBeenCalledWith(true);
  });

  it('returns all match summaries with deterministic pagination', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[], 0]);

    await expect(service.findAll({ page: 1, limit: 20 })).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
    expect(matchQuery.orderBy).toHaveBeenCalledWith('match.match_date', 'ASC');
  });

  it('returns grouped and chronological match details in five queries', async () => {
    matchQuery.getOne.mockResolvedValue(match);
    appearancesQuery.getMany.mockResolvedValue([
      {
        id: 'appearance-home',
        player: { id: 'home-player', name: 'Oliver Kahn' },
        team: match.homeTeam,
        starter: true,
        position: 'GK',
        shirt_number: 1,
        captain: true,
      },
      {
        id: 'appearance-away',
        player: { id: 'away-player', name: 'Ronaldo' },
        team: match.awayTeam,
        starter: false,
        position: 'FW',
        shirt_number: 9,
        captain: false,
      },
    ]);
    goalsQuery.getMany.mockResolvedValue([
      {
        id: 'goal-away',
        player: { id: 'away-player', name: 'Ronaldo' },
        team: match.awayTeam,
        minute: 67,
        added_time: null,
        penalty: false,
        own_goal: false,
      },
    ]);
    substitutionsQuery.getMany.mockResolvedValue([
      {
        id: 'substitution-id',
        team: match.awayTeam,
        playerOut: { id: 'out-id', name: 'Player Out' },
        playerIn: { id: 'in-id', name: 'Player In' },
        minute: 85,
        added_time: null,
      },
    ]);
    bookingsQuery.getMany.mockResolvedValue([
      {
        team: match.homeTeam,
        player: { id: 'home-player', name: 'Oliver Kahn' },
        card_type: CardType.YELLOW,
        minute: 90,
        added_time: 1,
      },
    ]);

    const result = await service.findOne('match-id');

    expect(result).toMatchObject({
      id: 'match-id',
      score: { home: 0, away: 2 },
      stadium: null,
      kickoffTime: '20:00:00',
      scoreExtraTime: null,
      scorePenalties: null,
      players: {
        homeTeam: {
          startingXI: [{ id: 'home-player', captain: true }],
          bench: [],
        },
        awayTeam: {
          startingXI: [],
          bench: [{ id: 'away-player', shirtNumber: 9 }],
        },
      },
      goals: {
        homeTeam: [],
        awayTeam: [{ minute: 67 }],
      },
      substitutions: [{ minute: 85 }],
      bookings: [
        {
          cardType: CardType.YELLOW,
          addedTime: 1,
        },
      ],
    });
    expect(result.players.homeTeam).toMatchObject({
      id: 'home-id',
      name: 'Germany',
    });
    expect(result.goals.awayTeam[0]).not.toHaveProperty('id');
    expect(result.substitutions[0]).not.toHaveProperty('id');
    expect(result.bookings[0]).not.toHaveProperty('id');
    expect(matchesRepository.createQueryBuilder).toHaveBeenCalledOnce();
    expect(matchPlayersRepository.createQueryBuilder).toHaveBeenCalledOnce();
    expect(goalsRepository.createQueryBuilder).toHaveBeenCalledOnce();
    expect(substitutionsRepository.createQueryBuilder).toHaveBeenCalledOnce();
    expect(bookingsRepository.createQueryBuilder).toHaveBeenCalledOnce();
    expect(goalsQuery.orderBy).toHaveBeenCalledWith(
      'goal.minute',
      'ASC',
      'NULLS LAST',
    );
  });

  it('rejects a missing match without querying event tables', async () => {
    matchQuery.getOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(matchPlayersRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(goalsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('filters stadium matches before deterministic pagination', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[], 0]);

    await service.findByStadium('stadium-id', { page: 1, limit: 20 });

    expect(matchQuery.where).toHaveBeenCalledWith(
      'match.stadium_id = :stadiumId',
      { stadiumId: 'stadium-id' },
    );
  });
});
