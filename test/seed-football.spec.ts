import { vi } from 'vitest';
import {
  deriveCardTypes,
  getGroupName,
  normalizePlayerName,
  parseKickoffTime,
  parseMatchScore,
  parseMinute,
  parseTournamentSource,
  resolveGoalPlayerTeam,
  seedTournaments,
  selectTournamentSources,
} from '../scripts/seed-football.mjs';

describe('football source parsers', () => {
  it('normalizes player names for storage and lookup', () => {
    expect(normalizePlayerName('  Shinji   Ono ')).toBe('Shinji Ono');
  });

  it('parses regular and added-time minutes', () => {
    expect(parseMinute('47')).toEqual({ minute: 47, added_time: null });
    expect(parseMinute('90+2')).toEqual({ minute: 90, added_time: 2 });
    expect(() => parseMinute('late')).toThrow('Invalid match minute');
  });

  it('parses local kickoff time and drops the UTC offset', () => {
    expect(parseKickoffTime('20:30 UTC+9')).toBe('20:30');
    expect(parseKickoffTime(undefined)).toBeNull();
  });

  it('derives second-yellow cards per player', () => {
    expect(
      deriveCardTypes([
        { type: 'Y', name: 'Player One' },
        { type: 'R', name: 'Player One' },
        { type: 'R', name: 'Player Two' },
        { type: 'Y/R', name: 'Player Three' },
      ]),
    ).toEqual(['yellow', 'second_yellow', 'red', 'second_yellow']);
  });

  it('resolves own-goal scorers against the opposing team', () => {
    expect(resolveGoalPlayerTeam(0, false)).toBe(0);
    expect(resolveGoalPlayerTeam(0, true)).toBe(1);
    expect(resolveGoalPlayerTeam(1, true)).toBe(0);
  });

  it('extracts group names from historical round labels', () => {
    expect(getGroupName('Group Stage, Group C')).toBe('C');
    expect(getGroupName('First Stage, Group A')).toBe('A');
    expect(getGroupName('Final')).toBeNull();
  });
});

describe('parseMatchScore', () => {
  it('maps array and object score formats', () => {
    expect(parseMatchScore([2, 1])).toMatchObject({
      home_score: 2,
      away_score: 1,
      home_score_et: null,
    });
    expect(parseMatchScore({ ft: [1, 1], et: [2, 1], p: [4, 3] })).toEqual({
      home_score: 1,
      away_score: 1,
      home_score_et: 2,
      away_score_et: 1,
      home_score_penalties: 4,
      away_score_penalties: 3,
    });
  });

  it('derives and validates regulation scores for legacy knockout data', () => {
    expect(
      parseMatchScore(
        { et: [2, 1] },
        [{ minute: 45 }, { minute: 110 }],
        [{ minute: 90 }],
      ),
    ).toMatchObject({
      home_score: 1,
      away_score: 1,
      home_score_et: 2,
      away_score_et: 1,
    });
    expect(() =>
      parseMatchScore({ et: [2, 1] }, [{ minute: 45 }], [{ minute: 90 }]),
    ).toThrow('Goal events do not match');
  });
});

describe('parseTournamentSource', () => {
  it('accepts missing optional match collections and derives dates', () => {
    const tournament = parseTournamentSource({
      matches: [
        {
          round: 'Final',
          date: '2002-06-30',
          team1: 'Brazil',
          team2: 'Germany',
          score: [2, 0],
        },
        {
          round: 'Group Stage, Group A',
          date: '2002-05-31',
          team1: 'France',
          team2: 'Senegal',
        },
      ],
    });

    expect(tournament.start_date).toBe('2002-05-31');
    expect(tournament.end_date).toBe('2002-06-30');
    expect(tournament.matches[0].goals).toEqual([[], []]);
  });

  it('fails loudly on malformed source data', () => {
    expect(() => parseTournamentSource({ matches: [] })).toThrow(
      'Tournament source must include at least one match',
    );
    expect(() =>
      parseTournamentSource({
        matches: [
          { round: 'Final', date: 'not-a-date', team1: 'A', team2: 'B' },
        ],
      }),
    ).toThrow('valid ISO date');
  });
});

describe('seedTournaments', () => {
  it('rolls back a failed tournament, continues, and closes the client', async () => {
    const queries: string[] = [];
    const client = {
      connect: vi.fn(),
      end: vi.fn(),
      query: vi.fn(async (text: string) => {
        queries.push(text);
        return { rows: [] };
      }),
    };
    const sources = [
      { name: 'FIFA World Cup', year: 2002, host: 'Host', url: 'first' },
      { name: 'FIFA World Cup', year: 2006, host: 'Host', url: 'second' },
    ];
    const fetchImplementation = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        matches: [
          {
            round: 'Final',
            date: '2002-06-30',
            team1: 'A',
            team2: 'B',
            score: [1, 0],
          },
        ],
      }),
    }));
    const importTournamentImplementation = vi
      .fn()
      .mockRejectedValueOnce(new Error('broken tournament'))
      .mockResolvedValueOnce({
        matches: 1,
        teams: 2,
        players: 0,
        goals: 0,
        bookings: 0,
        substitutions: 0,
      });
    const logger = { log: vi.fn(), error: vi.fn() };

    await expect(
      seedTournaments({
        client,
        sources,
        fetchImplementation,
        importTournamentImplementation,
        logger,
      }),
    ).rejects.toThrow('1 tournament import(s) failed');

    expect(queries).toEqual(['BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']);
    expect(importTournamentImplementation).toHaveBeenCalledTimes(2);
    expect(client.end).toHaveBeenCalledOnce();
    expect(logger.log).toHaveBeenCalledOnce();
  });
});

describe('selectTournamentSources', () => {
  it('selects one configured year', () => {
    expect(selectTournamentSources('2002')).toHaveLength(1);
    expect(selectTournamentSources('2002')[0].year).toBe(2002);
  });

  it('rejects invalid or unsupported years', () => {
    expect(() => selectTournamentSources('all')).toThrow('four-digit year');
    expect(() => selectTournamentSources('1942')).toThrow(
      'No tournament source',
    );
  });
});
