# Milestone 5 — reproducible database lifecycle

Completed for review. Milestone 6 has not started.

## Delivered

- Shared, validated database configuration for Nest and the standalone CLI; explicit entity registration and source/compiled migration discovery.
- Frozen initial schema migration, existing phone/session upgrades, and a deterministic user-list index. Clean databases no longer depend on synchronization.
- Source and compiled commands for status, migrations, rollback, verified legacy baseline adoption, default seeding and explicit administrator bootstrap.
- Serialized CLI mutations, transactional seeds, pending/unknown-history safeguards and sanitized command errors.
- Create-only role/permission seeds with no default account. Repeated admin bootstrap preserves credentials and customized grants; existing ordinary/deleted accounts are not promoted or reactivated.
- Corrected Compose database variables, internal connection port, health check database and loopback database binding. Added schema/logging examples and ignored local pnpm cache artifacts.
- Updated README setup and [database operations guide](database.md).

## Verification

Executed using Node 22.22.3 and disposable PostgreSQL 16:

- Type checking and application build passed.
- 44 unit tests passed across 6 suites.
- 58 HTTP tests passed across 3 suites.
- 39 PostgreSQL tests passed across 3 suites, including 11 database lifecycle tests.
- Lifecycle coverage includes all four migrations, repeat application, complete rollback/rebuild, current entity/schema equivalence, concurrent migration runners, two legacy phone-schema variants, drift rejection, concurrent seeding, existing credential/grant preservation, failed promotion rollback, nullable-phone rollback protection and source CLI rejection of unknown migration history.
- Actual source CLI migrated the disposable database. Actual compiled CLI migrated a fresh schema, seeded it and repeated migrations without changes.
- Development Compose configuration validated with `.env.example` and environment-file resolution disabled; no real `.env` was created.

## Review and remaining work

No existing application database was changed. Tests used isolated disposable schemas. Legacy baseline adoption intentionally refuses unexplained schema/history differences instead of guessing which changes already ran. Review upgrades against a database clone before applying them to deployed data.

Full application startup with operational middleware and production container deployment remain unverified. Configuration, CSRF/CORS, logging, health and shutdown are milestone 6. The known ESLint 9/legacy configuration mismatch and dependency/container/CI hardening remain milestone 7. This milestone does not establish production readiness or query performance at production scale.

Pause here for review before milestone 6.
