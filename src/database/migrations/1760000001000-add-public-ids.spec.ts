import { QueryRunner } from 'typeorm';
import { AddPublicIds1760000001000 } from './1760000001000-add-public-ids.js';

describe('AddPublicIds1760000001000', () => {
  const query = vi.fn();
  const queryRunner = { query } as unknown as QueryRunner;
  const migration = new AddPublicIds1760000001000();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds unique generated public IDs to every public football resource', async () => {
    await migration.up(queryRunner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    for (const table of [
      'tournaments',
      'teams',
      'players',
      'stadiums',
      'matches',
    ]) {
      expect(sql).toContain(`ALTER TABLE ${table} ADD COLUMN public_id SERIAL`);
      expect(sql).toContain(
        `ALTER TABLE ${table} ALTER COLUMN public_id SET NOT NULL`,
      );
      expect(sql).toContain(
        `ALTER TABLE ${table} ADD CONSTRAINT UQ_${table}_public_id UNIQUE (public_id)`,
      );
    }
  });

  it('removes public-ID constraints before their columns on rollback', async () => {
    await migration.down(queryRunner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain(
      'ALTER TABLE matches DROP CONSTRAINT UQ_matches_public_id',
    );
    expect(sql).toContain('ALTER TABLE matches DROP COLUMN public_id');
  });
});
