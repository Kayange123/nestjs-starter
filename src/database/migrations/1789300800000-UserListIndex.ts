import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserListIndex1789300800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_users_createdAt_id" ON "users" ("createdAt", "id")',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_users_createdAt_id"');
  }
}
