import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking, CardType } from '../bookings/entities/booking.entity.js';
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
  slug: '2002-germany-brazil-final',
  tournament: {
    id: 'tournament-id',
    slug: 'world-cup-2002',
    name: 'FIFA World Cup',
    year: 2002,
  },
  round: 'Final',
  match_date: '2002-06-30',
  kickoff_time: '20:00:00',
  homeTeam: { id: 'home-id', slug: 'germany', name: 'Germany' },
  awayTeam: { id: 'away-id', slug: 'brazil', name: 'Brazil' },
  home_score: 0,
  away_score: 2,
  home_score_et: null,
  away_score_et: null,
  home_score_penalties: null,
  away_score_penalties: null,
  stadium: null,
};
const appearances = [
  {
    id: 'appearance-home',
    player: { id: 'home-player', slug: 'oliver-kahn', name: 'Oliver Kahn' },
    team: match.homeTeam,
    starter: true,
    position: 'GK',
    shirt_number: 1,
    captain: true,
  },
  {
    id: 'appearance-away',
    player: { id: 'away-player', slug: 'ronaldo', name: 'Ronaldo' },
    team: match.awayTeam,
    starter: false,
    position: 'FW',
    shirt_number: 9,
    captain: false,
  },
];
const goals = [
  {
    id: 'goal-away',
    player: { id: 'away-player', slug: 'ronaldo', name: 'Ronaldo' },
    team: match.awayTeam,
    minute: 67,
    added_time: null,
    penalty: false,
    own_goal: false,
  },
];

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
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
      ],
    }).compile();
    service = module.get(MatchesService);
  });

  it('returns deterministic slug-only match summaries', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[match], 1]);
    await expect(
      service.findByTournament('tournament-id', { page: 2, limit: 10 }),
    ).resolves.toMatchObject({
      data: [{ slug: '2002-germany-brazil-final', date: '2002-06-30' }],
      meta: { page: 2, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(matchQuery.addOrderBy).toHaveBeenCalledWith('match.slug', 'ASC');
  });

  it('uses a grouped home-or-away condition for team matches', async () => {
    matchQuery.getManyAndCount.mockResolvedValue([[], 0]);
    await service.findByTeam('team-id', { page: 1, limit: 20 });
    expect(matchQuery.where.mock.calls[0][0].constructor.name).toBe('Brackets');
    expect(matchQuery.distinct).toHaveBeenCalledWith(true);
  });

  it('returns grouped, slug-only match details', async () => {
    matchQuery.getOne.mockResolvedValue(match);
    appearancesQuery.getMany.mockResolvedValue(appearances);
    goalsQuery.getMany.mockResolvedValue(goals);
    substitutionsQuery.getMany.mockResolvedValue([
      {
        team: match.awayTeam,
        playerOut: { id: 'out-id', slug: 'player-out', name: 'Player Out' },
        playerIn: { id: 'in-id', slug: 'player-in', name: 'Player In' },
        minute: 85,
        added_time: null,
      },
    ]);
    bookingsQuery.getMany.mockResolvedValue([
      {
        team: match.homeTeam,
        player: appearances[0].player,
        card_type: CardType.YELLOW,
        minute: 90,
        added_time: 1,
      },
    ]);

    const result = await service.findOne('2002-germany-brazil-final');
    expect(result).toMatchObject({
      slug: '2002-germany-brazil-final',
      players: {
        homeTeam: { slug: 'germany', startingXI: [{ slug: 'oliver-kahn' }] },
      },
      goals: { awayTeam: [{ player: { slug: 'ronaldo' } }] },
      substitutions: [{ playerIn: { slug: 'player-in' } }],
    });
    expect(result).not.toHaveProperty('id');
  });

  it('returns unpaginated grouped player and goal child resources', async () => {
    matchQuery.getOne.mockResolvedValue(match);
    appearancesQuery.getMany.mockResolvedValue(appearances);
    goalsQuery.getMany.mockResolvedValue(goals);

    await expect(
      service.findPlayers('2002-germany-brazil-final'),
    ).resolves.toMatchObject({
      homeTeam: { slug: 'germany', startingXI: [{ slug: 'oliver-kahn' }] },
      awayTeam: { slug: 'brazil', bench: [{ slug: 'ronaldo' }] },
    });
    await expect(
      service.findGoals('2002-germany-brazil-final'),
    ).resolves.toMatchObject({
      homeTeam: [],
      awayTeam: [{ player: { slug: 'ronaldo' } }],
    });
  });

  it('returns 404 semantics for an unknown slug without event queries', async () => {
    matchQuery.getOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(matchPlayersRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
