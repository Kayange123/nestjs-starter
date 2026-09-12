import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../src/database/database-options';
import { readDatabaseSettings } from '../src/config/database-config';
import {
  adoptBaseline,
  migrationStatus,
  withDatabaseLock,
} from '../src/database/operations';
import { InitialSchema1789041600000 } from '../src/database/migrations/1789041600000-InitialSchema';
import { seedInitialData } from '../src/seeders/seed-initial-data';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { Permission } from '../src/modules/auth/entities/permission.entity';

const run = promisify(execFile);
describe('Database initialization, migration adoption and seeding', () => {
  let source: DataSource;
  let schema: string;
  let env: NodeJS.ProcessEnv;
  beforeEach(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error('TEST_DATABASE_URL required');
    const url = new URL(process.env.TEST_DATABASE_URL);
    schema = `lifecycle_${randomUUID().replace(/-/g, '')}`;
    env = {
      ...process.env,
      NODE_ENV: 'test',
      DB_HOST: url.hostname,
      DB_PORT: url.port || '5432',
      DB_NAME: url.pathname.slice(1),
      DB_USER: decodeURIComponent(url.username),
      DB_PASSWORD: decodeURIComponent(url.password),
      DB_SCHEMA: schema,
      DB_SYNC: 'false',
      DB_LOGGING: 'false',
    };
    source = new DataSource(databaseOptions(readDatabaseSettings(env)));
    await source.initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
  });
  afterEach(async () => {
    if (source?.isInitialized) {
      try {
        await source.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await source.destroy();
      }
    }
  });
  const migrate = () =>
    withDatabaseLock(source, () =>
      source.runMigrations({ transaction: 'all' }),
    );

  it('migrates a clean schema, repeats without changes and matches current entities', async () => {
    expect(await migrate()).toHaveLength(4);
    expect(await migrate()).toHaveLength(0);
    expect(
      (await migrationStatus(source)).every((migration) => migration.applied),
    ).toBe(true);
    const diff = await source.driver.createSchemaBuilder().log();
    expect(diff.upQueries.map((query) => query.query)).toEqual([]);
  });
  it('rolls back all four migrations and can rebuild the schema', async () => {
    await migrate();
    for (let i = 0; i < 4; i++)
      await source.undoLastMigration({ transaction: 'all' });
    const runner = source.createQueryRunner();
    try {
      expect(await runner.hasTable(`${schema}.users`)).toBe(false);
    } finally {
      await runner.release();
    }
    expect(await migrate()).toHaveLength(4);
  });
  it('serializes competing migration runners', async () => {
    const other = new DataSource(databaseOptions(readDatabaseSettings(env)));
    await other.initialize();
    try {
      const outcomes = await Promise.all([
        migrate(),
        withDatabaseLock(other, () =>
          other.runMigrations({ transaction: 'all' }),
        ),
      ]);
      expect(outcomes.map((result) => result.length).sort()).toEqual([0, 4]);
    } finally {
      await other.destroy();
    }
  });
  it.each([false, true])(
    'adopts a verified legacy schema with nullable phone=%s without losing users',
    async (nullable) => {
      const runner = source.createQueryRunner();
      await runner.connect();
      try {
        await new InitialSchema1789041600000().up(runner);
        if (nullable)
          await runner.query(
            'ALTER TABLE users ALTER COLUMN "phoneNumber" DROP NOT NULL',
          );
      } finally {
        await runner.release();
      }
      const repository = source.getRepository(User);
      const user = await repository.save(
        repository.create({
          firstName: 'Existing',
          lastName: 'User',
          email: 'existing@test.example',
          phoneNumber: '+255700000000',
          password: await User.hashPassword('Strong:Password123'),
        }),
      );
      await withDatabaseLock(source, () => adoptBaseline(source));
      expect(await migrate()).toHaveLength(3);
      expect((await repository.findOneBy({ id: user.id })).email).toBe(
        user.email,
      );
      expect(await adoptBaseline(source)).toBe('Baseline already recorded');
    },
  );
  it('refuses adoption when the existing schema differs', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await new InitialSchema1789041600000().up(runner);
      await runner.query(
        'ALTER TABLE users ALTER COLUMN "firstName" TYPE varchar(99)',
      );
    } finally {
      await runner.release();
    }
    await expect(adoptBaseline(source)).rejects.toThrow('differs');
    expect(
      (await migrationStatus(source)).every((migration) => !migration.applied),
    ).toBe(true);
  });
  it('seeds only roles and permissions by default and tolerates concurrent repeats', async () => {
    await migrate();
    const results = await Promise.all([
      seedInitialData(source),
      seedInitialData(source),
    ]);
    expect(
      results.reduce((sum, item) => sum + item.permissionsCreated, 0),
    ).toBe(12);
    expect(results.reduce((sum, item) => sum + item.rolesCreated, 0)).toBe(2);
    expect(await source.getRepository(User).count()).toBe(0);
    expect(await source.getRepository(Permission).count()).toBe(12);
    expect(await source.getRepository(Role).count()).toBe(2);
  });
  it('creates an explicit admin without resetting passwords or customized role grants on repeats', async () => {
    await migrate();
    const admin = {
      email: 'bootstrap@test.example',
      password: 'Strong:Password123',
    };
    expect((await seedInitialData(source, admin)).administrator).toBe(
      'created',
    );
    const repo = source.getRepository(User);
    const user = await repo.findOne({
      where: { email: admin.email },
      select: { id: true, password: true },
      relations: { roles: true },
    });
    expect(await user.verifyPassword(admin.password)).toBe(true);
    expect(user.roles.map((role) => role.name)).toContain('Admin');
    const roles = source.getRepository(Role);
    const role = await roles.findOneBy({ name: 'Admin' });
    role.permissions = [];
    await roles.save(role);
    expect(
      (
        await seedInitialData(source, {
          ...admin,
          password: 'Different:Password123',
        })
      ).administrator,
    ).toBe('unchanged');
    expect(
      (
        await repo.findOne({
          where: { id: user.id },
          select: { password: true },
        })
      ).password,
    ).toBe(user.password);
    expect((await roles.findOneBy({ name: 'Admin' })).permissions).toHaveLength(
      0,
    );
  });
  it('refuses to promote an existing ordinary user and rolls back seed writes', async () => {
    await migrate();
    const repo = source.getRepository(User);
    await repo.save(
      repo.create({
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@test.example',
        password: await User.hashPassword('Strong:Password123'),
      }),
    );
    await expect(
      seedInitialData(source, {
        email: 'existing@test.example',
        password: 'Different:Password123',
      }),
    ).rejects.toThrow('Refusing to promote');
    expect(await source.getRepository(Role).count()).toBe(0);
    expect(await source.getRepository(Permission).count()).toBe(0);
  });
  it('protects nullable-phone rollback when email-only users exist', async () => {
    await migrate();
    await seedInitialData(source, {
      email: 'bootstrap@test.example',
      password: 'Strong:Password123',
    });
    await source.undoLastMigration({ transaction: 'all' }); // list index
    await source.undoLastMigration({ transaction: 'all' }); // sessions
    await expect(
      source.undoLastMigration({ transaction: 'all' }),
    ).rejects.toThrow();
    expect(
      (await migrationStatus(source)).find((migration) =>
        migration.name.startsWith('OptionalUserPhone'),
      ).applied,
    ).toBe(true);
  });
  it('runs the documented source CLI against the disposable schema', async () => {
    const args = [
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      'src/database/cli.ts',
    ];
    await run(process.execPath, [...args, 'migrate'], { env });
    const seeded = await run(process.execPath, [...args, 'seed'], { env });
    expect(seeded.stdout).toContain('not-requested');
    expect(
      (await migrationStatus(source)).every((migration) => migration.applied),
    ).toBe(true);
    expect(await source.getRepository(User).count()).toBe(0);
    await source.query(
      "INSERT INTO migrations (timestamp, name) VALUES (1789387200000, 'Unknown1789387200000')",
    );
    expect(await migrationStatus(source)).toContainEqual({
      name: 'Unknown1789387200000',
      applied: true,
    });
    await expect(
      run(process.execPath, [...args, 'migrate'], { env }),
    ).rejects.toMatchObject({ code: 1 });
    await expect(
      run(process.execPath, [...args, 'seed-admin'], {
        env: { ...env, SEED_ADMIN_EMAIL: '', SEED_ADMIN_PASSWORD: '' },
      }),
    ).rejects.toMatchObject({ code: 1 });
  }, 30000);
});
