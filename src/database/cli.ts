import { DatabaseCommandError } from './command-error';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  seedInitialData,
  SeedAdmin,
  validateSeedAdmin,
} from '../seeders/seed-initial-data';
import {
  adoptBaseline,
  migrationStatus,
  schemaName,
  withDatabaseLock,
} from './operations';

async function main(): Promise<void> {
  const command = process.argv[2];
  if (
    !['show', 'migrate', 'revert', 'baseline', 'seed', 'seed-admin'].includes(
      command,
    )
  )
    throw new DatabaseCommandError(
      'Expected show, migrate, revert, baseline, seed or seed-admin',
    );
  let source: DataSource;
  try {
    // Import lazily so configuration failures reach the sanitized CLI error handler.
    source = (await import('./data-source')).default;
    let admin: SeedAdmin;
    if (command === 'seed-admin') {
      admin = {
        email: process.env.SEED_ADMIN_EMAIL ?? '',
        password: process.env.SEED_ADMIN_PASSWORD ?? '',
      };
      validateSeedAdmin(admin);
    }
    await source.initialize();
    const result =
      command === 'show'
        ? await migrationStatus(source)
        : await withDatabaseLock(source, async () => {
            const known = new Set(
              source.migrations.map(
                (migration) => migration.name ?? migration.constructor.name,
              ),
            );
            if (
              (await migrationStatus(source)).some(
                (migration) => !known.has(migration.name),
              )
            )
              throw new DatabaseCommandError(
                'Unrecognized migration history; review the database and code version before changing it',
              );
            if (command === 'migrate') {
              await source.query(
                `CREATE SCHEMA IF NOT EXISTS "${schemaName(source)}"`,
              );
              return (await source.runMigrations({ transaction: 'all' })).map(
                (migration) => migration.name,
              );
            }
            if (command === 'revert') {
              await source.undoLastMigration({ transaction: 'all' });
              return 'Last migration reverted';
            }
            if (command === 'baseline') return adoptBaseline(source);
            if (
              (await migrationStatus(source)).some(
                (migration) => !migration.applied,
              )
            )
              throw new DatabaseCommandError(
                'Apply pending migrations before seeding',
              );
            return seedInitialData(source, admin);
          });
    new Logger('DatabaseCLI').log(result);
  } finally {
    if (source?.isInitialized) await source.destroy();
  }
}

main().catch((error: unknown) => {
  // Do not print driver errors, environment values or seed credentials.
  new Logger('DatabaseCLI').error(
    error instanceof DatabaseCommandError
      ? error.message
      : 'Database command failed. Check connectivity, credentials and schema/migration state; see docs/database.md.',
  );
  process.exitCode = 1;
});
