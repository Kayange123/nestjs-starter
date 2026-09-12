import { MigrationInterface, QueryRunner } from 'typeorm';

/** Frozen pre-session schema; later migrations apply nullable phones and sessions. */
export class InitialSchema1789041600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "displayName" character varying(30) NOT NULL, "genericName" character varying(30), "module" character varying(20), CONSTRAINT "UQ_25bc710ab2d1ab61bb7ac4cf5d9" UNIQUE ("displayName"), CONSTRAINT "UQ_2faa376783bdcee7abf7ebbdae8" UNIQUE ("genericName"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "roles" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying(50) NOT NULL, "isSystemRole" boolean NOT NULL DEFAULT false, "description" character varying(255), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "users" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "firstName" character varying(15) NOT NULL, "lastName" character varying(15) NOT NULL, "avatarUrl" character varying(200), "publicUserId" character varying(50) NOT NULL, "email" character varying(30), "phoneNumber" character varying(15) NOT NULL, "bio" character varying(500), "password" character varying(255) NOT NULL, "addedById" integer, CONSTRAINT "UQ_aa31e50daa09b4c28dce6141980" UNIQUE ("publicUserId"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_1e3d0240b49c40521aaeb953293" UNIQUE ("phoneNumber"), CONSTRAINT "users_unique_constraints" UNIQUE ("email", "phoneNumber", "publicUserId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_b3ac42a19048f8ce936348aeea" ON "users" ("firstName", "lastName", "email", "phoneNumber", "publicUserId") ',
    );
    await queryRunner.query(
      'CREATE TABLE "role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "user_roles" ("userId" integer NOT NULL, "roleId" integer NOT NULL, CONSTRAINT "PK_88481b0c4ed9ada47e9fdd67475" PRIMARY KEY ("userId", "roleId"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_472b25323af01488f1f66a06b6" ON "user_roles" ("userId") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_86033897c009fcca8b6505d6be" ON "user_roles" ("roleId") ',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "FK_4040f168f4b94bc6f805f124f14" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"',
    );
    await queryRunner.query(
      'ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"',
    );
    await queryRunner.query(
      'ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "FK_4040f168f4b94bc6f805f124f14"',
    );
    await queryRunner.query('DROP INDEX "IDX_86033897c009fcca8b6505d6be"');
    await queryRunner.query('DROP INDEX "IDX_472b25323af01488f1f66a06b6"');
    await queryRunner.query('DROP TABLE "user_roles"');
    await queryRunner.query('DROP INDEX "IDX_17022daf3f885f7d35423e9971"');
    await queryRunner.query('DROP INDEX "IDX_178199805b901ccd220ab7740e"');
    await queryRunner.query('DROP TABLE "role_permissions"');
    await queryRunner.query('DROP INDEX "IDX_b3ac42a19048f8ce936348aeea"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TABLE "roles"');
    await queryRunner.query('DROP TABLE "permissions"');
  }
}
