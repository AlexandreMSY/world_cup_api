import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleActiveCredential1760000002000 implements MigrationInterface {
  name = 'EnforceSingleActiveCredential1760000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      [
        'WITH ranked_api_keys AS (',
        '  SELECT',
        '    id,',
        '    ROW_NUMBER() OVER (',
        '      PARTITION BY user_id',
        '      ORDER BY created_at DESC, id DESC',
        '    ) AS row_number',
        '  FROM api_keys',
        '  WHERE active = true',
        ')',
        'UPDATE api_keys',
        'SET active = false',
        'FROM ranked_api_keys',
        'WHERE api_keys.id = ranked_api_keys.id',
        '  AND ranked_api_keys.row_number > 1',
      ].join('\n'),
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX UQ_api_keys_one_active_per_user ON api_keys (user_id) WHERE active',
    );
    await queryRunner.query(
      'ALTER TABLE users ADD COLUMN access_token_expires_at TIMESTAMP',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX UQ_api_keys_one_active_per_user');
    await queryRunner.query(
      'ALTER TABLE users DROP COLUMN access_token_expires_at',
    );
  }
}
