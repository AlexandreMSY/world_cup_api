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

const tournamentTeamsRepository = {
  createQueryBuilder: vi.fn(),
};

const tournamentsRepository = {
  findAndCount: vi.fn(),
  findOneBy: vi.fn(),
};

const matchesService = {
  findByTournament: vi.fn(),
};

describe('TournamentsService', () => {
  let service: TournamentsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    tournamentTeamsQueryBuilder.innerJoinAndSelect.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
    tournamentTeamsQueryBuilder.where.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
    tournamentTeamsQueryBuilder.orderBy.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
    tournamentTeamsQueryBuilder.addOrderBy.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
    tournamentTeamsQueryBuilder.skip.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
    tournamentTeamsQueryBuilder.take.mockReturnValue(
      tournamentTeamsQueryBuilder,
    );
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
        {
          provide: MatchesService,
          useValue: matchesService,
        },
      ],
    }).compile();

    service = module.get(TournamentsService);
  });

  it('returns tournaments in a pagination envelope', async () => {
    tournamentsRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 'tournament-id',
          name: 'FIFA World Cup',
          year: 2002,
          host: 'South Korea, Japan',
          start_date: '2002-05-31',
          end_date: '2002-06-30',
        },
      ],
      1,
    ]);

    await expect(service.findAll({ page: 1, limit: 20 })).resolves.toEqual({
      data: [
        {
          id: 'tournament-id',
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

  it('returns one tournament', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue({
      id: 'tournament-id',
      name: 'FIFA World Cup',
      year: 2002,
      host: null,
      start_date: null,
      end_date: null,
    });

    await expect(service.findOne('tournament-id')).resolves.toMatchObject({
      id: 'tournament-id',
      startDate: null,
      endDate: null,
    });
  });

  it('rejects a missing tournament', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns tournament teams after validating the parent', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue({
      id: 'tournament-id',
      name: 'FIFA World Cup',
      year: 2002,
      host: null,
      start_date: null,
      end_date: null,
    });
    tournamentTeamsQueryBuilder.getManyAndCount.mockResolvedValue([
      [{ team: { id: 'team-id', name: 'Brazil', code: null } }],
      1,
    ]);

    await expect(
      service.findTeams('tournament-id', { page: 1, limit: 20 }),
    ).resolves.toEqual({
      data: [{ id: 'team-id', name: 'Brazil', code: null }],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
    expect(tournamentTeamsQueryBuilder.orderBy).toHaveBeenCalledWith(
      'team.name',
      'ASC',
    );
    expect(tournamentTeamsQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'team.id',
      'ASC',
    );
  });

  it('does not query teams when the tournament is missing', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.findTeams('missing-id', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tournamentTeamsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns tournament matches after validating the parent', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue({
      id: 'tournament-id',
      name: 'FIFA World Cup',
      year: 2002,
      host: null,
      start_date: null,
      end_date: null,
    });
    matchesService.findByTournament.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    await expect(
      service.findMatches('tournament-id', { page: 1, limit: 20 }),
    ).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
    expect(matchesService.findByTournament).toHaveBeenCalledWith(
      'tournament-id',
      { page: 1, limit: 20 },
    );
  });

  it('does not query matches when the tournament is missing', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.findMatches('missing-id', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(matchesService.findByTournament).not.toHaveBeenCalled();
  });
});
