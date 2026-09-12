# Final engineering report

## 1. Executive summary

The starter now has explicit runtime API boundaries, tested user authorization, persisted token sessions, reproducible database setup and a verified container workflow. All eight implementation checkpoints are complete. Deployment and publication decisions remain in [release readiness](release-readiness.md).

## 2. Request parameters and pagination

The generic QueryOptionsDto mixed request validation, ORM capabilities and response construction. It was replaced by a bounded PaginationQueryDto, resource-specific UserQueryDto, a query mapper and response helper. Defaults remain page 1/limit 10; limit is at most 100. Sort fields are allowlisted and have an ID tie-breaker. Search values are bound and LIKE metacharacters escaped. Creation dates require valid timezone-bearing timestamps and ordered bounds. Arbitrary projections, relations and unbounded reads are unavailable. Numeric user paths are validated. Cursor pagination remains a separate future resource contract; see [user queries](user-queries.md).

## 3. Security improvements

Individual user reads/updates enforce owner or Admin access; create/list/delete require Admin. Response mapping excludes credentials. Hashing uses a single scrypt path, including colon-containing passwords. Whitelisting rejects mass-assignment inputs. CORS, request limits, Helmet and production Swagger settings are explicit. Cookie-session/CSRF wiring was removed because credentials are not ambient cookies. Unexpected errors and HTTP logs exclude sensitive payloads.

## 4. Architecture

DTOs describe accepted input, services own business logic and transaction boundaries, and a small resource mapper owns list-query construction. PostgreSQL configuration is shared by Nest and the CLI. Bootstrap configuration is shared with full-application tests. Existing Nest/TypeORM structure was retained; no generic repository framework was added.

## 5. Authentication

Access JWTs have purpose, issuer, audience and session binding. Refresh credentials are opaque, with only hashes persisted. Rotation is transactional; reuse revokes the family. Logout revokes one session and password changes revoke all sessions transactionally. Consistent locks protect rotation/password races. Strict replay handling requires clients to serialize refresh calls. See [authentication](authentication.md).

## 6. Observability

Server-generated request IDs correlate safe structured completion logs. Liveness is independent of PostgreSQL; readiness probes it with a deadline. Shutdown hooks close application resources. Tracing and a metrics exporter were assessed as follow-up work rather than adding unused infrastructure.

## 7. Developer experience

Current guides cover local startup, database adoption, seed behavior, configuration, queries and token rotation. Source/compiled database commands are explicit. Swagger user responses now match their runtime data envelope. Contributor instructions and templates identify required verification.

## 8. CI/CD

CI runs frozen installs, formatting, lint, types, unit/HTTP/database tests, build, dependency audit and container verification. GitHub Actions are commit-pinned. Publishing is manually invoked and gated on CI. Placeholder SSH deployments were removed; remote execution remains unverified.

## 9. Docker

The Node manifest and pnpm version are pinned. Runtime contains compiled output and production dependencies, runs as node and starts Node directly. A fetch-based health command replaces wget. The image passed migration/seed/readiness and graceful-stop checks with a read-only filesystem and dropped capabilities.

## 10. Open-source materials

Added contribution/security guidance, unreleased changelog, PR/bug templates and dependency-update configuration. Maintainer contact, ownership and license publication remain explicit release decisions. No identity or CODEOWNERS assignment was fabricated.

## 11. Dependencies

Added: no new runtime library; pnpm configuration supplies a scoped Multer security override. Removed: unused bcrypt, body-parser, cookie-parser, csrf, csurf, express-session, direct multer, pagination wrapper, Swagger UI wrapper, Nest Axios wrapper and redundant type/lint dependencies. Updated: Nest 11 packages, TypeORM 0.3, Express 5, validation/logging/database packages and development tooling including ESLint 10. Retained intentionally: PostgreSQL/TypeORM, Passport/JWT, Joi, class-validator/transformer, cache-manager, Winston and the Nest modules used by the starter. Full locked versions are in pnpm-lock.yaml.

## 12. Files changed

- API/auth: src/modules/auth, src/modules/users, src/modules/shared.
- Infrastructure: src/config, src/database, src/seeders, src/configure-app.ts, src/main.ts, src/lib/logger, src/modules/health.
- Verification: src/**/*.spec.ts, test, scripts/container-smoke.cjs.
- Delivery: Dockerfile, compose.yml, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, eslint.config.cjs, .github, .husky, environment/version/ignore files.
- Documentation: README.md, docs, CONTRIBUTING.md, SECURITY.md and CHANGELOG.md.

## 13. API contract changes

User responses are explicitly mapped; individual successes use data while lists retain data/pagination. Unknown/null/malformed DTO input is rejected. Query date bounds are createdFrom/createdTo. Refresh and logout routes are implemented. Health responses are simplified. Swagger individual-user envelopes now match runtime behavior.

## 14. Breaking changes

Intentional: removed all/fields/sorts/dateRange query capabilities; literal search metacharacters; enforced ownership and strict inputs; old JWT invalidation; opaque rotating refresh tokens; password-change reauthentication; no CSRF-token exchange; exact CORS origins; production Swagger disabled; reduced body limit; revised health responses; explicit migration/seed setup; no pnpm in runtime images. See CHANGELOG.md and the upgrade guides.

## 15. Remaining recommendations

Complete the concrete deployment and publication checks in release-readiness.md. Prioritize proxy/rate-limit topology, backup recovery, session cleanup and deployment TLS over optional generators, tracing or cursor abstractions.

## 16. Verification

The final milestone report records the checks performed after the documentation/OpenAPI changes. Milestones 5–7 record database/container checks with disposable resources. Failures found during implementation were corrected and rerun; no failing checks were suppressed. Remote CI, publication, deployment and OS-image vulnerability scanning have not been claimed as verified.
