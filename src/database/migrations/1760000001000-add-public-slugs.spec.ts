import { QueryRunner } from 'typeorm';
import { AddPublicSlugs1760000001000 } from './1760000001000-add-public-slugs.js';

describe('AddPublicSlugs1760000001000', () => {
  const query = vi.fn();
  const queryRunner = { query } as unknown as QueryRunner;
  const migration = new AddPublicSlugs1760000001000();

  beforeEach(() => {
    vi.clearAllMocks();
    query.mockImplementation(async (statement: string) =>
      statement.trim().startsWith('SELECT') ? [] : undefined,
    );
  });

  it('backfills public slugs before making every column unique and required', async () => {
    await migration.up(queryRunner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of [
      'tournaments',
      'teams',
      'players',
      'stadiums',
      'matches',
    ]) {
      expect(sql).toContain(`ALTER TABLE ${table} ADD COLUMN slug VARCHAR`);
      expect(sql).toContain(
        `ALTER TABLE ${table} ALTER COLUMN slug SET NOT NULL`,
      );
    }
    expect(sql).toContain('UQ_tournaments_slug');
    expect(sql).toContain('UQ_matches_slug');
  });

  it('removes public slug constraints before columns on rollback', async () => {
    await migration.down(queryRunner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain(
      'ALTER TABLE matches DROP CONSTRAINT UQ_matches_slug',
    );
    expect(sql).toContain('ALTER TABLE matches DROP COLUMN slug');
  });
});
