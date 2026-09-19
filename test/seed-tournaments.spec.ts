import {
  createTournamentUpsert,
  getTournamentDates,
} from '../scripts/seed-tournaments.mjs';

describe('getTournamentDates', () => {
  it('uses the earliest and latest match dates', () => {
    const dates = getTournamentDates({
      matches: [
        { date: '2002-06-30' },
        { date: '2002-05-31' },
        { date: '2002-06-04' },
      ],
    });

    expect(dates).toEqual({
      start_date: '2002-05-31',
      end_date: '2002-06-30',
    });
  });

  it('rejects malformed tournament sources', () => {
    expect(() => getTournamentDates({ matches: [] })).toThrow(
      'Tournament source must include at least one match',
    );
    expect(() =>
      getTournamentDates({ matches: [{ date: '2002-02-30' }] }),
    ).toThrow('Match at index 0 must include a valid ISO date');
  });
});

describe('createTournamentUpsert', () => {
  it('builds a parameterized upsert query', () => {
    const query = createTournamentUpsert(
      {
        name: 'FIFA World Cup',
        year: 2002,
        host: 'South Korea, Japan',
        start_date: '2002-05-31',
        end_date: '2002-06-30',
      },
      'f905760a-9b05-4dce-bf8e-fd79dd2661f2',
    );

    expect(query.text).toContain('VALUES ($1, $2, $3, $4, $5, $6)');
    expect(query.text).toContain('ON CONFLICT (name, year) DO UPDATE');
    expect(query.values).toEqual([
      'f905760a-9b05-4dce-bf8e-fd79dd2661f2',
      'FIFA World Cup',
      2002,
      'South Korea, Japan',
      '2002-05-31',
      '2002-06-30',
    ]);
  });
});
