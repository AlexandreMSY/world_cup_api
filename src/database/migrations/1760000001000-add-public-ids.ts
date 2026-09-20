import { MigrationInterface, QueryRunner } from 'typeorm';

const tables = ['tournaments', 'teams', 'players', 'stadiums', 'matches'];

export class AddPublicIds1760000001000 implements MigrationInterface {
  name = 'AddPublicIds1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN public_id SERIAL`,
      );
      await queryRunner.query(
        `ALTER TABLE ${table} ALTER COLUMN public_id SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT UQ_${table}_public_id UNIQUE (public_id)`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...tables].reverse()) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT UQ_${table}_public_id`,
      );
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN public_id`);
    }
  }
}
