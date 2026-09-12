import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthSessions1789214400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "auth_sessions" (
      "id" uuid CONSTRAINT "PK_auth_sessions" PRIMARY KEY, "userId" integer NOT NULL CONSTRAINT "FK_auth_sessions_user" REFERENCES "users"("id") ON DELETE CASCADE,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_auth_sessions_user" ON "auth_sessions" ("userId")',
    );
    await queryRunner.query(`CREATE TABLE "auth_refresh_tokens" (
      "id" uuid CONSTRAINT "PK_auth_refresh_tokens" PRIMARY KEY, "sessionId" uuid NOT NULL CONSTRAINT "FK_auth_refresh_tokens_session" REFERENCES "auth_sessions"("id") ON DELETE CASCADE,
      "tokenHash" varchar(64) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "usedAt" timestamptz
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_auth_refresh_tokens_session" ON "auth_refresh_tokens" ("sessionId")',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auth_refresh_tokens"');
    await queryRunner.query('DROP TABLE "auth_sessions"');
  }
}
