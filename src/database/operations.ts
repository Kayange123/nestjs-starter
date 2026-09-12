import { DatabaseCommandError } from './command-error';
import { DataSource } from 'typeorm';
import { BASE_ENTITIES } from './database-options';
import { User } from '../modules/users/entities/user.entity';
import { InitialSchema1789041600000 } from './migrations/1789041600000-InitialSchema';

export function schemaName(source: DataSource): string {
  const schema =
    'schema' in source.options ? (source.options.schema ?? 'public') : 'public';
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema))
    throw new DatabaseCommandError('Invalid database schema');
  return schema;
}

export async function withDatabaseLock<T>(
  source: DataSource,
  work: () => Promise<T>,
): Promise<T> {
  const runner = source.createQueryRunner();
  await runner.connect();
  try {
    await runner.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2))', [
      'nestjs-starter:database',
      schemaName(source),
    ]);
    try {
      return await work();
    } finally {
      await runner.query(
        'SELECT pg_advisory_unlock(hashtext($1), hashtext($2))',
        ['nestjs-starter:database', schemaName(source)],
      );
    }
  } finally {
    await runner.release();
  }
}

export async function migrationStatus(
  source: DataSource,
): Promise<Array<{ name: string; applied: boolean }>> {
  const runner = source.createQueryRunner();
  try {
    const schema = schemaName(source);
    const executed: Array<{ name: string }> = (await runner.hasTable(
      `${schema}.migrations`,
    ))
      ? await runner.query(`SELECT name FROM "${schema}"."migrations"`)
      : [];
    const known = source.migrations.map((migration) => ({
      name: migration.name ?? migration.constructor.name,
      applied: executed.some(
        (row) => row.name === (migration.name ?? migration.constructor.name),
      ),
    }));
    return [
      ...known,
      ...executed
        .filter(
          (row) => !known.some((migration) => migration.name === row.name),
        )
        .map((row) => ({ name: row.name, applied: true })),
    ];
  } finally {
    await runner.release();
  }
}

/** Explicit adoption only: compare the actual base schema before recording its history. */
export async function adoptBaseline(source: DataSource): Promise<string> {
  const status = await migrationStatus(source);
  if (
    status.some(
      (row) => row.name === 'InitialSchema1789041600000' && row.applied,
    )
  )
    return 'Baseline already recorded';
  if (status.some((row) => row.applied))
    throw new DatabaseCommandError(
      'Existing migration history requires manual review',
    );
  const checker = new DataSource({
    ...source.options,
    entities: BASE_ENTITIES,
    migrations: [InitialSchema1789041600000],
    synchronize: false,
    logging: false,
  });
  await checker.initialize();
  const runner = checker.createQueryRunner();
  try {
    const schema = schemaName(checker);
    const tables = await runner.getTables(
      ['users', 'roles', 'permissions', 'user_roles', 'role_permissions'].map(
        (name) => `${schema}.${name}`,
      ),
    );
    if (tables.length !== 5)
      throw new DatabaseCommandError(
        'Baseline requires all five existing base tables; use db:migrate for an empty schema',
      );
    if (
      (await runner.hasTable(`${schema}.auth_sessions`)) ||
      (await runner.hasTable(`${schema}.auth_refresh_tokens`))
    )
      throw new DatabaseCommandError(
        'Previously applied session tables require manual migration-history review',
      );
    const metadata = checker.getMetadata(User);
    // Both legacy non-null phones and the separately applied nullable-phone upgrade are supported.
    metadata.findColumnWithPropertyName('phoneNumber').isNullable =
      tables
        .find((table) => table.name.split('.').pop() === 'users')
        .findColumnByName('phoneNumber')?.isNullable ?? false;
    metadata.indices = metadata.indices.filter(
      (index) => index.name !== 'IDX_users_createdAt_id',
    );
    const differences = await checker.driver.createSchemaBuilder().log();
    if (differences.upQueries.length)
      throw new DatabaseCommandError(
        'Existing schema differs from the baseline; review it on a clone before adopting',
      );
    await checker.runMigrations({ fake: true, transaction: 'all' });
    return 'Baseline verified and recorded; run db:migrate for remaining migrations';
  } finally {
    await runner.release();
    await checker.destroy();
  }
}
