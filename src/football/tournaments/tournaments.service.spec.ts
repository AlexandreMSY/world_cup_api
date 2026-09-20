import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchesService } from '../matches/matches.service.js';
import { TournamentTeam } from './entities/tournament-team.entity.js';
import { Tournament } from './entities/tournament.entity.js';
import { TournamentsService } from './tournaments.service.js';

const query = {
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
  id: 'tournament-uuid',
  public_id: 23,
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
    ] as const) {
      query[method].mockReturnValue(query);
    }
    tournamentTeamsRepository.createQueryBuilder.mockReturnValue(query);
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

  it('returns numeric public IDs in tournament responses', async () => {
    tournamentsRepository.findAndCount.mockResolvedValue([[tournament], 1]);

    await expect(
      service.findAll({ page: 1, limit: 20 }),
    ).resolves.toMatchObject({
      data: [{ id: 23, name: 'FIFA World Cup' }],
    });
    expect(tournamentsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ public_id: true }),
        order: { year: 'ASC', public_id: 'ASC' },
      }),
    );
  });

  it('resolves a public ID before using the internal UUID for child queries', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(tournament);
    query.getManyAndCount.mockResolvedValue([
      [{ team: { id: 'team-uuid', public_id: 7, name: 'Brazil', code: null } }],
      1,
    ]);
    matchesService.findByTournament.mockResolvedValue({ data: [], meta: {} });

    await expect(service.findOne(23)).resolves.toMatchObject({ id: 23 });
    await expect(
      service.findTeams(23, { page: 1, limit: 20 }),
    ).resolves.toMatchObject({ data: [{ id: 7 }] });
    await service.findMatches(23, { page: 1, limit: 20 });
    expect(tournamentsRepository.findOneBy).toHaveBeenCalledWith({
      public_id: 23,
    });
    expect(matchesService.findByTournament).toHaveBeenCalledWith(
      'tournament-uuid',
      { page: 1, limit: 20 },
    );
  });

  it('rejects an unknown numeric ID before child queries', async () => {
    tournamentsRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tournamentTeamsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
