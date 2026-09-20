import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity.js';
import { TournamentsService } from './tournaments.service.js';

const tournamentsRepository = {
  findAndCount: vi.fn(),
};

describe('TournamentsService', () => {
  let service: TournamentsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: getRepositoryToken(Tournament),
          useValue: tournamentsRepository,
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
    expect(tournamentsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { year: 'ASC', id: 'ASC' },
        skip: 0,
        take: 20,
      }),
    );
  });
});
