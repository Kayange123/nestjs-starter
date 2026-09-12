# Milestone 4: persisted authentication sessions

## Implemented

- Separate purpose-bound access JWTs from opaque refresh credentials.
- Add AuthSessionsModule, AuthSessionsService, AuthSession and RefreshToken entities under the existing auth module.
- Persist hashed refresh credentials, fixed session expiry and revocation state.
- Add refresh rotation, committed replay revocation and authenticated logout.
- Validate session state on every access-token check.
- Make password updates and all-session revocation atomic; serialize login issuance/refresh against password changes with user-first locks.
- Add validated, typed auth configuration and fix the authentication throttler's named/default configuration mismatch.
- Add safe authentication audit events and Swagger token envelopes.
- Supply and PostgreSQL-test the session migration. No dependencies were added or updated.

The user service owns the password-change transaction. The session service owns issuance and rotation transactions. Neither depends on the other, avoiding a service/module cycle; both use the same persisted session entity for revocation.

See [authentication contracts and upgrade notes](authentication.md) for endpoints, client refresh serialization, settings and intentional compatibility changes.

## Validation

| Check | Final result |
| --- | --- |
| pnpm test --runInBand | 37 tests passed in 5 suites |
| pnpm test:e2e --runInBand | 58 tests passed in 3 suites |
| pnpm test:integration with disposable PostgreSQL 16 | 28 tests passed in 2 suites |
| pnpm typecheck | Passed |
| pnpm build | Passed |
| Prettier checks over milestone source/tests | Passed after correcting one formatting finding |
| git diff --check | Passed |

The integration suite exercises the real AuthModule and UsersModule against PostgreSQL, with an isolated random schema and loopback HTTP server. It verifies token-purpose separation, expiry, issuer/audience/algorithm restrictions, refresh hashing, rotation, replay, concurrent refresh, unrelated session isolation, logout, HTTP password-change revocation, stale-login races, soft-deleted users, throttling, audit-log secrecy and migration up/down. Failure injection verifies password rollback when revocation fails and refresh rollback when token signing fails. The pagination integration regressions still pass.

The earlier user HTTP suite now mocks session operations as well as user persistence; the new PostgreSQL suite provides real persisted-session coverage. Tests do not cover the complete AppModule bootstrap/CSRF middleware chain or production deployment. The existing ESLint configuration failure remains open from milestone 1.

## Review checkpoint

Strict replay handling intentionally invalidates a family after concurrent use of one refresh credential; no replay grace window was introduced. Access tokens become dependent on database availability so revocation is effective at the next check. In-flight authorized work is not cancelled.

Existing JWTs require reauthentication, and the new migration must be applied before deployment. No existing application database was modified. The disposable container and test data were removed. No commit or deployment was performed.

Pause before milestone 5: reproducible database initialization, a migration runner, safe seed commands and local database setup. Production-secret rules, middleware/CORS configuration, distributed throttling and broader operations remain in their planned milestones. Cleanup of expired session history is documented but not scheduled automatically.
