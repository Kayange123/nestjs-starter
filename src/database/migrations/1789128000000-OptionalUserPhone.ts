import { MigrationInterface, QueryRunner } from 'typeorm';

/** Existing installations must apply this before email-only registration. */
export class OptionalUserPhone1789128000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "phoneNumber" DROP NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL refuses rollback if email-only users still have NULL phones.
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET NOT NULL',
    );
  }
}
