# Database setup and upgrades

The application and CLI share database options and explicit entity registrations. Schema synchronization defaults to false and is rejected in production. CLI commands always disable synchronization and SQL logging. Startup does not run migrations or seeds automatically.

## New database

Use Node 22 (tested with 22.22.3), install dependencies, and copy `.env.example` to `.env`. Set database credentials and application secrets. Start PostgreSQL, then run:

```sh
pnpm db:show
pnpm db:migrate
pnpm db:seed
```

The CLI reads `.env` using Node's native environment-file loader; existing process variables take precedence. It needs only database configuration, not JWT or HTTP configuration. Required variables are `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. `DB_SCHEMA` defaults to `public`; it accepts lowercase letters, digits and underscores, starting with a letter or underscore, up to 63 characters. The migration command creates a missing configured schema. The database itself must already exist.

Four ordered migrations create the original base tables, make user phone numbers optional, add authentication sessions and refresh-token hashes, and add the `(createdAt, id)` user-list index. The older composite index remains. Index coverage does not establish production performance; representative query plans remain necessary.

## Existing database

Back up the database and test the upgrade on a clone first. A database originally created by synchronization has no baseline migration history. For the matching legacy schema:

```sh
pnpm db:baseline
pnpm db:migrate
pnpm db:seed
```

Baseline adoption verifies the five base tables against the original entity schema, accepting either nullable or non-null phone numbers. It records only the initial migration without rebuilding tables or replacing rows. Schema differences, pre-existing session tables, or conflicting migration history require manual review. Do not fake every migration to bypass a failure. Previously applied manual session migrations need deliberate history reconciliation on a clone. Unknown migration names block CLI mutations to avoid operating with the wrong code version.

## Seeding

`db:seed` creates missing default permissions and Admin/User roles in one transaction. Repeated runs preserve existing grants and descriptions. It creates no user and supplies no default credentials. Seed commands require all migrations to be applied.

To bootstrap an administrator, supply `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` through your environment or secret manager, then run `pnpm db:seed:admin`. The email must pass validation and fit the current 30-character database limit. The password must pass strong-password validation and contain 8–128 characters. Do not commit credentials. Existing administrators retain their password and role assignments. An existing ordinary or deleted user is never promoted or reactivated; the command fails and rolls back seed changes. Deleted default roles or permissions also require explicit operator review.

Concurrent CLI mutations use a PostgreSQL advisory lock per schema. Seeds additionally take a transaction lock so direct concurrent seed calls are serialized. Use the supplied commands consistently; unrelated manual SQL does not honor these locks. The CLI lock occupies a connection while the operation uses another; retain at least two available pool connections.

## Commands and deployment

| Source command       | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `pnpm db:show`       | Show known and unknown migration history     |
| `pnpm db:migrate`    | Apply pending migrations in a transaction    |
| `pnpm db:revert`     | Revert the last migration                    |
| `pnpm db:baseline`   | Verify and record the original schema        |
| `pnpm db:seed`       | Create missing default roles and permissions |
| `pnpm db:seed:admin` | Explicit administrator bootstrap             |

After `pnpm build`, append `:prod` to these commands to run compiled JavaScript. The compiled commands discover only compiled migrations; source commands discover only TypeScript migrations. Ship the complete build output and production dependencies. Production packaging is reviewed separately in milestone 7.

Generate a candidate with `pnpm db:generate src/database/migrations/DescriptiveName` against a development database with all existing migrations applied. Review generated SQL and rollback behavior before committing it. Never edit an already-applied migration to introduce a new change.

Rollback is potentially destructive: reverting sessions removes session/token records, and reverting the initial schema removes base tables and their data. Reverting optional phone numbers fails transactionally while null phone values exist. Choose a forward correction when rollback would discard needed data.

## Verification

Integration tests require `TEST_DATABASE_URL` pointing to a disposable PostgreSQL database. Run `pnpm test:integration`; suites create and drop isolated schemas. Tests cover clean initialization, repeat application, rollback, entity/schema alignment, competing runners, legacy adoption, drift rejection, concurrent seeds, credential preservation and CLI execution. See [milestone 5](milestone-5.md) for the executed checks.
