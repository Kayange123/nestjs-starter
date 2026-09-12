# Changelog

## Unreleased — starter hardening

- Enforced owner/Admin user access and safe user response mapping; repaired password hashing and optional-phone registration.
- Replaced generic query capabilities with bounded offset pagination and explicit filters/sorts. Removed `all`, `fields`, `sorts`, and `dateRange`; use `createdFrom`/`createdTo`. LIKE metacharacters now search literally. Unsupported/null/malformed input is rejected.
- Added persisted sessions, rotating opaque refresh credentials and replay revocation. Previous JWTs require fresh login. Password changes revoke all user sessions. Access lifetime defaults to 900 seconds.
- Added migration/baseline/seed commands; synchronization remains disabled. Bootstrap administrator credentials must be explicitly supplied.
- Removed cookie-session and CSRF-token exchange. Browser origins must be explicitly allowlisted; credentialed/wildcard CORS is disabled. Production Swagger is disabled.
- Replaced detailed health output with liveness and database readiness. Added body limits, request IDs, structured console logs and shutdown hooks.
- Updated dependencies, aligned Express 5, repaired linting, pinned tool versions and hardened the container. Production images run Node directly and contain no pnpm CLI.
- Replaced automatic placeholder deployments with manual CI-gated image publishing.

These are intentional breaking changes. Test client migration and database upgrades on a clone before release. No version tag or release has been created.
