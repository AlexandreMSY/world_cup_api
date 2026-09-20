import { QueryRunner } from 'typeorm';
import { EnforceSingleActiveCredential1760000002000 } from './1760000002000-enforce-single-active-credential.js';

describe('EnforceSingleActiveCredential1760000002000', () => {
  const query = vi.fn();
  const queryRunner = { query } as unknown as QueryRunner;
  const migration = new EnforceSingleActiveCredential1760000002000();

  beforeEach(() => {
    vi.clearAllMocks();
    query.mockResolvedValue(undefined);
  });

  it('keeps only the newest active API key and enforces one active key per user', async () => {
    await migration.up(queryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('ROW_NUMBER() OVER');
    expect(sql).toContain('PARTITION BY user_id');
    expect(sql).toContain('ORDER BY created_at DESC, id DESC');
    expect(sql).toContain('SET active = false');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX UQ_api_keys_one_active_per_user ON api_keys (user_id) WHERE active',
    );
    expect(sql).toContain(
      'ALTER TABLE users ADD COLUMN access_token_expires_at TIMESTAMP',
    );
  });

  it('removes the unique index and access-token expiry column on rollback', async () => {
    await migration.down(queryRunner);

    expect(query.mock.calls.map(([statement]) => statement)).toEqual([
      'DROP INDEX UQ_api_keys_one_active_per_user',
      'ALTER TABLE users DROP COLUMN access_token_expires_at',
    ]);
  });
});
