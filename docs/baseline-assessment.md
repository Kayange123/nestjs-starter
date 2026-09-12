# Milestone 1: baseline assessment

Baseline commit: `ca10a62eae406d53dcdc72e6a7e4d859d0545258`.
Application code and lockfile were not changed during this milestone.

## Verification

Environment: Node 22.22.3, pnpm 11.3.0. These are the exact versions used for this baseline, not yet repository-enforced versions. CI currently specifies Node 20 and pnpm 8; the lockfile format is 9.0. Toolchain alignment remains necessary.

| Check | Result |
| --- | --- |
| `pnpm install --offline --frozen-lockfile --ignore-scripts` | Failed: cached tarball for @nestjs/axios missing |
| `pnpm install --frozen-lockfile --ignore-scripts --fetch-retries=0 --fetch-timeout=15000` | Passed; lifecycle scripts intentionally not executed |
| `pnpm exec eslint '{src,apps,libs,test}/**/*.ts'` | Failed: ESLint 9 requires flat configuration; repository has .eslintrc.js |
| `pnpm exec prettier --check 'src/**/*.ts' 'test/**/*.ts'` | Failed: four files need formatting |
| `pnpm typecheck` | Passed |
| `pnpm test --runInBand` | Passed: one suite, six health-controller tests |
| `pnpm build` | Passed |
| `pnpm test:e2e --runInBand` | Failed before tests: cannot resolve src/app.service |
| Docker daemon inspection | Blocked by socket permissions; no container tests run |

Formatting findings: roles.guard.ts, users.controller.ts, user.dto.ts, generate-permissions.ts.
Test discovery confirms src/modules/health/health.e2e-spec.ts is excluded from both configured suites. The application e2e test expects Hello World, while AppService returns configured description text. Passing compilation does not establish runtime readiness. Native dependency lifecycle scripts and database integration remain unverified. Installation created an untracked .pnpm-store directory; it is local tooling output, not a deliverable.

## Architecture and contracts

- Bootstrap configures URI versioning, CORS, Helmet, body limits, validation, filters, response wrapping and request logging.
- Auth, users and health are feature modules. Controllers delegate to services; UsersService directly uses a TypeORM repository.
- Auth exposes login/register; access and refresh JWTs currently share validation semantics. No refresh/logout route or persisted session lifecycle exists.
- User list/create/delete require Admin role; individual read/update require JWT only. JWT user lookup does not load roles.
- User responses return entities; the response interceptor wraps data but does not sanitize it. Swagger response types do not enforce serialization.
- QueryOptionsDto validates input, builds TypeORM options and formats responses. Search uses backend-defined fields; findAndCount uses the same filters for matching totals. Pagination defaults to page 1/limit 10, with a nominal maximum of 100, bypassed by all.
- Configuration is Joi-validated but several settings are ignored in bootstrap/auth. Database entities load from dist; synchronization defaults off. No migration or seed execution scripts are present.
- Cache is in-memory. Health checks inspect HTTP self-reachability, disk and memory rather than PostgreSQL readiness. CSRF middleware uses cookies and applies to mutating requests, including authentication.

## Prioritized confirmed findings

1. Enforce ownership/administrator checks on individual user read/update.
2. Map safe user response DTOs and remove password/token body logging.
3. Unify password hashing: update currently applies bcrypt then entity scrypt; colon-containing passwords skip entity hashing.
4. Reconcile required phoneNumber/publicUserId columns with registration and seeding.
5. Load roles for authenticated authorization and separate access/refresh validation.
6. Enable whitelisting and return real validation exceptions; align error body status with HTTP status.
7. Handle missing User-Agent headers and validate numeric path parameters.
8. Replace generic database capabilities in query DTOs with explicit resource contracts. Reject unbounded reads, arbitrary fields and unsupported sorts; validate integer pagination and date ranges; add stable ordering.
9. Repair e2e module resolution, test discovery and stale assertions before relying on regression checks.
10. Correct Compose DATABASE_HOST to DB_HOST; align tooling and add reproducible database initialization.

These are source-confirmed defects unless a command result above explicitly establishes runtime behavior. No vulnerability scan or full deployment validation was performed.

## Revised execution decisions

- Start milestone 2 with the minimal test harness repair required to exercise security regressions. Broad CI modernization remains in milestone 7.
- Define the user response contract explicitly; do not rely on the entity's toListDto getter, which assumes roles are loaded.
- Preserve existing q/order parameter names and pagination response shape where practical. Record removal of all/fields/multi-sort as intentional contract changes.
- Keep session implementation in milestone 4, with its migration delivered alongside the feature rather than deferring necessary schema work to milestone 5.
- Keep offset pagination and a small user query mapper. Cursor implementation, MFA, telemetry integration and resource generation are optional roadmap work.
- Before milestone 2, agree that phoneNumber can be optional for email registration, while publicUserId is generated server-side; this is a proposed contract decision, not an implemented change.

## Checkpoint

Milestone 1 inspection is complete, with runtime limitations recorded. No security fixes have been applied. Pause for user approval before milestone 2.
