# Milestone 2: user-management security and correctness

## Changes

- Individual user reads and updates require the account owner or an Admin. List, create and delete remain Admin-only. JWT lookup loads roles; guards fail closed when roles are absent.
- User HTTP responses use an explicit allowlist: id, firstName, lastName, email, createdAt, updatedAt and role names. Passwords are excluded from default TypeORM selection and explicitly selected only for credential checks.
- Creation and password updates hash plaintext once with the existing scrypt format. Entity lifecycle hooks no longer guess whether a password is already hashed. Seeds hash explicitly. Verification validates the stored format and uses timing-safe comparison.
- Email registration generates a public UUID server-side and does not require a phone number. The public registration DTO still accepts firstName, lastName, email and password only.
- Create/update inputs allow only declared fields; null patch values, invalid types and extra properties return 400. Name/email length limits match current database columns. New passwords require 8–128 characters with the existing registration strength policy. Login accepts existing passwords without imposing new strength requirements.
- Numeric route parameters use ParseIntPipe. Ownership checks additionally reject nonpositive and unsafe integer IDs before evaluating access.
- Request logs contain method, route template, duration and status, not bodies, credentials, cookies, headers or query strings. Exception logs omit raw exception messages and SQL parameters. HTTP and error-body statuses agree; unexpected production error messages are generic.
- Jest resolves src imports and discovers health HTTP tests. Tests now assert the configured welcome response. Swagger's welcome link points to /docs.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck` | Passed |
| `pnpm build` | Passed |
| `pnpm test --runInBand` | Passed: 21 tests in 3 suites |
| `pnpm test:e2e --runInBand` | Passed: 24 tests in 3 suites |
| Prettier check over changed/new TypeScript and JSON files | Passed |
| `git diff --check` | Passed |
| `pnpm exec eslint '{src,apps,libs,test}/**/*.ts'` | Still fails: pre-existing ESLint 9 / legacy configuration mismatch |

HTTP tests use loopback listeners and real Nest controllers, services, JWT strategy, authorization guards, validation, response wrapping and exception handling. User persistence is mocked. Health's external HTTP probe is mocked. These tests do not prove full AppModule startup, PostgreSQL behavior, CSRF middleware behavior or production deployment. Sandbox socket restrictions required running HTTP tests outside the sandbox.

Regression coverage includes cross-user access denial, owner access, Admin access, safe responses, role injection, invalid IDs, invalid/null patches, registration followed by login, password-change login, old-password rejection, malformed hashes, duplicate email prechecks, missing users, status consistency and observed log redaction.

## Existing database upgrade

Apply `OptionalUserPhone1789128000000` to existing schemas before deploying email-only registration. The migration is supplied under src/database/migrations. A generic migration runner is still scheduled for milestone 5; deployments with an existing TypeORM runner can register this migration. The equivalent schema operation is:

```sql
ALTER TABLE "users" ALTER COLUMN "phoneNumber" DROP NOT NULL;
```

No live database was changed and this migration has not been validated against PostgreSQL here. Rollback refuses to restore NOT NULL while any email-only users have NULL phones; do not invent phone values to force rollback.

Existing valid scrypt passwords continue to verify. Previously stored plaintext colon passwords or bcrypt-then-scrypt passwords cannot be safely recovered automatically and require a password reset. Custom seeders or direct persistence code must call User.hashPassword explicitly before storing passwords; application service methods already do so.

## Intentional contract changes

- Unauthorized cross-user reads/updates now return 403.
- Responses no longer expose the entire entity; roles are string names, matching UserResponseDto. Consumers using undocumented entity properties must adapt.
- Extra properties and invalid/null patch values now return 400 instead of being accepted or reaching the database.
- Password policy is consistent for registration, administrator creation and password updates; existing login credentials are not strength-validated.
- Password fields are not selected by default. Internal consumers that verify credentials must use the credential lookup method.

## Review checkpoint

Milestone 2 is implemented and locally verified within the limits above. No commit, deployment or database migration was performed.

Remaining risks are not hidden by these checks: generic all/fields/sorting remain for milestone 3; access/refresh token separation, rotation and revocation remain for milestone 4; database initialization, default seed credentials, configuration/security middleware and broad CI modernization remain in subsequent milestones. Password changes do not yet revoke existing JWTs. Do not treat this checkpoint as production readiness.

Pause before milestone 3, which replaces the generic query capabilities with explicit user query contracts while preserving offset pagination and the existing response envelope.
