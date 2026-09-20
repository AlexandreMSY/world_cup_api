import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchesService } from '../matches/matches.service.js';
import { TournamentTeam } from './entities/tournament-team.entity.js';
import { Tournament } from './entities/tournament.entity.js';
import { TournamentsService } from './tournaments.service.js';

const tournamentTeamsQueryBuilder = {
  innerJoinAndSelect: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  addOrderBy: vi.fn(),
  skip: vi.fn(),
  take: vi.fn(),
  getManyAndCount: vi.fn(),
};
const tournamentTeamsRepository = { createQueryBuilder: vi.fn() };
const tournamentsRepository = { findAndCount: vi.fn(), findOneBy: vi.fn() };
const matchesService = { findByTournament: vi.fn() };
const tournament = {
  id: 'tournament-id',
  slug: 'world-cup-2002',
  name: 'FIFA World Cup',
  year: 2002,
  host: 'South Korea, Japan',
  start_date: '2002-05-31',
  end_date: '2002-06-30',
};

describe('TournamentsService', () => {
  let service: TournamentsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    for (const method of [
      'innerJoinAndSelect',
      'where',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      tournamentTeamsQueryBuilder[method].mockReturnValue(
        tournamentTeamsQueryBuilder,
      );
    }
    tournamentTeamsRepository.createQueryBuilder.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
    const module = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: getRepositoryToken(Tournament),
          useValue: tournamentsRepository,
        },
        {
          provide: getRepositoryToken(TournamentTeam),
          useValue: tournamentTeamsRepository,
        },
        { provide: MatchesService, useValue: matchesService },
      ],
    }).compile();
    service = module.get(TournamentsService);
  });

  it('returns slug-only tournaments in a pagination envelope', async () => {
    tournamentsRepository.findAndCount.mockResolvedValue([[tournament], 1]);

    await expect(service.findAll({ page: 1, limit: 20 })).resolves.toEqual({
      data: [
        {
          slug: 'world-cup-2002',
          name: 'FIFA World Cup',
          year: 2002,
          host: 'South Korea, Japan',
          startDate: '2002-05-31',
          endDate: '2002-06-30',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
  });

  it('resolves a tournament slug for child queries', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(tournament);
    tournamentTeamsQueryBuilder.getManyAndCount.mockResolvedValue([
      [{ team: { id: 'team-id', slug: 'brazil', name: 'Brazil', code: null } }],
      1,
    ]);
    matchesService.findByTournament.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    await expect(service.findOne('world-cup-2002')).resolves.toMatchObject({
      slug: 'world-cup-2002',
    });
    await expect(
      service.findTeams('world-cup-2002', { page: 1, limit: 20 }),
    ).resolves.toMatchObject({ data: [{ slug: 'brazil' }] });
    await service.findMatches('world-cup-2002', { page: 1, limit: 20 });
    expect(tournamentsRepository.findOneBy).toHaveBeenCalledWith({
      slug: 'world-cup-2002',
    });
    expect(matchesService.findByTournament).toHaveBeenCalledWith(
      'tournament-id',
      { page: 1, limit: 20 },
    );
  });

  it('rejects an unknown slug before querying children', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.findTeams('missing', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tournamentTeamsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
