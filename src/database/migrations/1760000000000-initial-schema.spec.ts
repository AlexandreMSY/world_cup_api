import { QueryRunner } from 'typeorm';
import { InitialSchema1760000000000 } from './1760000000000-initial-schema.js';

describe('InitialSchema1760000000000', () => {
  const query = vi.fn();
  const queryRunner = { query } as unknown as QueryRunner;
  const migration = new InitialSchema1760000000000();

  beforeEach(() => {
    vi.clearAllMocks();
    query.mockResolvedValue(undefined);
  });

  it('creates every table, UUID relationship, constraint, and index', async () => {
    await migration.up(queryRunner);

    const sql = query.mock.calls
      .map(([statement]) => statement)
      .join(String.fromCharCode(10));
    for (const table of [
      'users',
      'api_keys',
      'tournaments',
      'teams',
      'tournament_teams',
      'players',
      'stadiums',
      'matches',
      'match_players',
      'goals',
      'bookings',
      'substitutions',
    ]) {
      expect(sql).toContain('CREATE TABLE ' + table);
    }

    expect(sql).toContain('DEFAULT uuid_generate_v4()');
    expect(sql).toContain('UQ_tournaments_name_year');
    expect(sql).toContain('UQ_matches_tournament_date_teams');
    expect(sql).toContain('CHK_matches_different_teams');
    expect(sql).toContain('key_fingerprint VARCHAR(64) UNIQUE');
    expect(sql).toContain('IDX_matches_home_team_id');
    expect(sql).toContain('IDX_goals_player_id');
    expect(sql).toContain('IDX_substitutions_player_in_id');
    expect(sql.match(/ON DELETE RESTRICT/g)?.length).toBeGreaterThan(10);
  });

  it('drops dependent tables before their referenced tables', async () => {
    await migration.down(queryRunner);

    const statements = query.mock.calls.map(([statement]) => statement);
    expect(statements).toEqual([
      'DROP TABLE substitutions',
      'DROP TABLE bookings',
      'DROP TABLE goals',
      'DROP TABLE match_players',
      'DROP TABLE matches',
      'DROP TABLE stadiums',
      'DROP TABLE players',
      'DROP TABLE tournament_teams',
      'DROP TABLE teams',
      'DROP TABLE tournaments',
      'DROP TABLE api_keys',
      'DROP TABLE users',
      'DROP TYPE card_type_enum',
    ]);
  });
});
